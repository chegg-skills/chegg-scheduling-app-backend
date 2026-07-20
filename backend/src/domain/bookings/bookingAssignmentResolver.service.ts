import {
  AssignmentStrategy,
  BookingStatus,
  Prisma,
  SessionLeadershipStrategy,
} from "@prisma/client";
import {
  INTERACTION_TYPE_CAPS,
  type InteractionType,
} from "../../shared/constants/interactionType";
import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { isCoachAvailable } from "../availability/availability.service";
import {
  filterConflictsForSlot,
  type BookingWithEventBuffer,
} from "../availability/availabilityConflict.service";
import { getRequestLogger } from "../../shared/logging/requestContext";
import {
  type AssignmentContext,
  type CoachAvailabilityPrefetch,
  getAssignmentStrategy,
  type CoachCandidate,
  getRoutingState,
  updateRoutingState,
} from "./assignment.service";
import type { BookableEvent } from "./booking.shared";

export type ResolvedBookingCoachSelection = {
  assignedCoachId: string | null;
  coCoachUserIds: string[];
};

type ResolveBookingCoachSelectionInput = {
  preferredCoachId?: string;
  activeCoaches: CoachCandidate[];
  event: BookableEvent;
  start: Date;
  end: Date;
  allowSharedSessionOverlap: boolean;
  matchedScheduleSlotId?: string | null;
  /** Excludes this booking's own record from every coach's conflict check —
   * set on reschedule so the booking's own prior time doesn't count as a
   * conflict against itself. Left undefined for new bookings and follow-ups,
   * which have no "self" to exclude. */
  excludeBookingId?: string;
  tx: Prisma.TransactionClient;
  /** Batched per-coach availability data — built once by resolveBookingCoachSelection
   * before any selection loop so candidate probes don't fire per-coach queries. */
  coachDataMap?: Map<string, CoachAvailabilityPrefetch>;
};

/**
 * Pre-fetches everything the availability checks need for the whole candidate pool
 * in ~5 IN-clause queries (timezones, event overrides, weekly schedules, exceptions,
 * conflicts), mirroring getAvailableSlots' batch strategy. All queries are tx-bound —
 * a global-prisma query here would need a second pool connection while the caller
 * holds the event/slot row lock, deadlocking the pool under load.
 *
 * The conflict pre-filter reuses filterConflictsForSlot (the pure equivalent of
 * getCoachConflicts' overlap/same-session logic); excludeBookingId has no equivalent
 * there, so it is applied in the raw fetch instead.
 */
const buildCoachDataMap = async ({
  activeCoaches,
  event,
  start,
  end,
  allowSharedSessionOverlap,
  matchedScheduleSlotId,
  excludeBookingId,
  tx,
}: Omit<ResolveBookingCoachSelectionInput, "preferredCoachId" | "coachDataMap">): Promise<
  Map<string, CoachAvailabilityPrefetch>
> => {
  const map = new Map<string, CoachAvailabilityPrefetch>();
  const coachIds = activeCoaches.map((c) => c.coachUserId);
  if (coachIds.length === 0) return map;

  const ignoreWeeklySchedule = event.bookingMode === "FIXED_SLOTS";
  // Mirrors getCoachConflicts' fixed lookback for buffers on existing bookings.
  const lookbackStart = new Date(start.getTime() - 120 * 60 * 1000);

  const [users, overrideRows, weeklyRows, exceptionRows, conflictBookings, conflictSlots] =
    await Promise.all([
      tx.user.findMany({
        where: { id: { in: coachIds } },
        select: { id: true, timezone: true },
      }),
      ignoreWeeklySchedule
        ? []
        : tx.eventCoachWeeklyAvailability.findMany({
            where: { eventId: event.id, coachUserId: { in: coachIds } },
            select: { coachUserId: true, dayOfWeek: true, startTime: true, endTime: true },
          }),
      ignoreWeeklySchedule
        ? []
        : tx.userWeeklyAvailability.findMany({ where: { userId: { in: coachIds } } }),
      tx.userAvailabilityException.findMany({
        // Exception dates are stored as midnight-UTC timestamps but matched against the
        // session's LOCAL calendar day (findAvailabilityException compares dateStrings).
        // A [start, end] range would miss the midnight anchor for any session that
        // doesn't start at exactly 00:00 UTC — widen by 48h each side to cover every
        // IANA offset plus cross-midnight sessions.
        where: {
          userId: { in: coachIds },
          date: {
            gte: new Date(start.getTime() - 48 * 60 * 60 * 1000),
            lte: new Date(end.getTime() + 48 * 60 * 60 * 1000),
          },
        },
      }),
      tx.booking.findMany({
        where: {
          OR: [{ coachUserId: { in: coachIds } }, { coCoachUserIds: { hasSome: coachIds } }],
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
          ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
          startTime: { lt: end },
          endTime: { gt: lookbackStart },
        },
        include: { event: true },
      }) as Promise<BookingWithEventBuffer[]>,
      tx.eventScheduleSlot.findMany({
        where: {
          assignedCoachId: { in: coachIds },
          isActive: true,
          isCancelled: false,
          startTime: { lt: end },
          endTime: { gt: lookbackStart },
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          eventId: true,
          assignedCoachId: true,
          event: { select: { bufferAfterMinutes: true } },
        },
      }),
    ]);

  const timezoneByCoach = new Map(users.map((u) => [u.id, u.timezone]));

  const overridesByCoach = new Map<string, CoachAvailabilityPrefetch["weeklyOverride"]>();
  for (const o of overrideRows) {
    const list = overridesByCoach.get(o.coachUserId) ?? [];
    list.push({ dayOfWeek: o.dayOfWeek, startTime: o.startTime, endTime: o.endTime });
    overridesByCoach.set(o.coachUserId, list);
  }

  const weeklyByCoach = new Map<string, typeof weeklyRows>();
  for (const r of weeklyRows) {
    const list = weeklyByCoach.get(r.userId) ?? [];
    list.push(r);
    weeklyByCoach.set(r.userId, list);
  }

  const exceptionsByCoach = new Map<string, typeof exceptionRows>();
  for (const r of exceptionRows) {
    const list = exceptionsByCoach.get(r.userId) ?? [];
    list.push(r);
    exceptionsByCoach.set(r.userId, list);
  }

  const rawConflictsByCoach = new Map<string, BookingWithEventBuffer[]>();
  const addConflict = (coachId: string, conflict: BookingWithEventBuffer) => {
    const list = rawConflictsByCoach.get(coachId) ?? [];
    list.push(conflict);
    rawConflictsByCoach.set(coachId, list);
  };
  const coachIdSet = new Set(coachIds);
  for (const b of conflictBookings) {
    if (b.coachUserId && coachIdSet.has(b.coachUserId)) addConflict(b.coachUserId, b);
    for (const ccId of b.coCoachUserIds ?? []) {
      if (coachIdSet.has(ccId)) addConflict(ccId, b);
    }
  }
  for (const s of conflictSlots) {
    if (!s.assignedCoachId || !coachIdSet.has(s.assignedCoachId)) continue;
    // Shape slot assignments like getCoachConflicts does for its overlap filter.
    addConflict(s.assignedCoachId, {
      startTime: s.startTime,
      endTime: s.endTime,
      scheduleSlotId: s.id,
      eventId: s.eventId,
      event: { bufferAfterMinutes: s.event?.bufferAfterMinutes ?? null },
    } as unknown as BookingWithEventBuffer);
  }

  const sameSessionOptions = {
    eventId: allowSharedSessionOverlap ? event.id : undefined,
    scheduleSlotId: allowSharedSessionOverlap ? (matchedScheduleSlotId ?? null) : undefined,
  };

  for (const coachId of coachIds) {
    map.set(coachId, {
      timezone: timezoneByCoach.get(coachId),
      weeklyOverride: overridesByCoach.get(coachId) ?? [],
      calendarData: {
        weekly: weeklyByCoach.get(coachId) ?? [],
        exceptions: exceptionsByCoach.get(coachId) ?? [],
      },
      prefetchedConflicts: filterConflictsForSlot(
        rawConflictsByCoach.get(coachId) ?? [],
        start,
        end,
        sameSessionOptions,
      ),
    });
  }

  return map;
};

const buildAvailabilityOptions = ({
  event,
  allowSharedSessionOverlap,
  matchedScheduleSlotId,
  excludeBookingId,
  tx,
}: Pick<
  ResolveBookingCoachSelectionInput,
  "event" | "allowSharedSessionOverlap" | "matchedScheduleSlotId" | "excludeBookingId" | "tx"
>) => ({
  ignoreWeeklySchedule: event.bookingMode === "FIXED_SLOTS",
  eventId: allowSharedSessionOverlap ? event.id : undefined,
  scheduleSlotId: allowSharedSessionOverlap ? (matchedScheduleSlotId ?? null) : undefined,
  excludeBookingId,
  tx,
});

const buildAssignmentContext = ({
  event,
  start,
  end,
  allowSharedSessionOverlap,
  matchedScheduleSlotId,
  excludeBookingId,
  tx,
  coachDataMap,
}: Omit<
  ResolveBookingCoachSelectionInput,
  "preferredCoachId" | "activeCoaches"
>): AssignmentContext => ({
  prisma: tx,
  eventId: event.id,
  teamId: event.teamId,
  start,
  end,
  bookingMode: event.bookingMode,
  allowSharedSessionOverlap,
  matchedScheduleSlotId,
  excludeBookingId,
  coachDataMap,
});

const isHostAvailable = async ({
  coachUserId,
  event,
  start,
  end,
  allowSharedSessionOverlap,
  matchedScheduleSlotId,
  excludeBookingId,
  tx,
  coachDataMap,
}: {
  coachUserId: string;
  event: BookableEvent;
  start: Date;
  end: Date;
  allowSharedSessionOverlap: boolean;
  matchedScheduleSlotId?: string | null;
  excludeBookingId?: string;
  tx: Prisma.TransactionClient;
  coachDataMap?: Map<string, CoachAvailabilityPrefetch>;
}): Promise<boolean> => {
  const prefetch = coachDataMap?.get(coachUserId);
  const weeklyOverride = prefetch
    ? prefetch.weeklyOverride
    : event.bookingMode !== "FIXED_SLOTS"
      ? await tx.eventCoachWeeklyAvailability.findMany({
          where: { eventId: event.id, coachUserId },
          select: { dayOfWeek: true, startTime: true, endTime: true },
        })
      : [];

  return isCoachAvailable(
    coachUserId,
    start,
    end,
    {
      ...buildAvailabilityOptions({ event, allowSharedSessionOverlap, matchedScheduleSlotId, excludeBookingId, tx }),
      weeklyOverride,
      ...(prefetch && {
        timezone: prefetch.timezone,
        calendarData: prefetch.calendarData,
        prefetchedConflicts: prefetch.prefetchedConflicts,
      }),
    },
  );
};

const assertHostAvailability = async ({
  unavailableMessage,
  ...params
}: Parameters<typeof isHostAvailable>[0] & { unavailableMessage: string }): Promise<void> => {
  if (!(await isHostAvailable(params))) {
    throw new ErrorHandler(StatusCodes.CONFLICT, unavailableMessage);
  }
};

const resolvePreferredSingleHost = async ({
  preferredCoachId,
  activeCoaches,
  event,
  start,
  end,
  allowSharedSessionOverlap,
  matchedScheduleSlotId,
  excludeBookingId,
  tx,
  coachDataMap,
}: ResolveBookingCoachSelectionInput & {
  preferredCoachId: string;
}): Promise<ResolvedBookingCoachSelection> => {
  const preferredHost = activeCoaches.find(
    (candidate) => candidate.coachUserId === preferredCoachId,
  );

  if (!preferredHost) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "Specified coach is not eligible for this event.",
    );
  }

  await assertHostAvailability({
    coachUserId: preferredCoachId,
    event,
    start,
    end,
    allowSharedSessionOverlap,
    matchedScheduleSlotId,
    excludeBookingId,
    tx,
    coachDataMap,
    unavailableMessage: "Coach is not available.",
  });

  return {
    assignedCoachId: preferredCoachId,
    coCoachUserIds: [],
  };
};

const resolveStrategyLead = async ({
  activeCoaches,
  event,
  start,
  end,
  allowSharedSessionOverlap,
  matchedScheduleSlotId,
  excludeBookingId,
  tx,
  coachDataMap,
}: Omit<ResolveBookingCoachSelectionInput, "preferredCoachId">): Promise<{
  assignedCoachId: string;
}> => {
  const strategy = getAssignmentStrategy(event.assignmentStrategy);
  const result = await strategy.resolveCoach(
    activeCoaches,
    buildAssignmentContext({
      event,
      start,
      end,
      allowSharedSessionOverlap,
      matchedScheduleSlotId,
      excludeBookingId,
      tx,
      coachDataMap,
    }),
  );

  if (!result.assignedCoachId) {
    throw new ErrorHandler(StatusCodes.CONFLICT, "No available coaches found.");
  }

  return result;
};

const resolveViaStrategyLead = async (
  input: Omit<ResolveBookingCoachSelectionInput, "preferredCoachId">,
): Promise<ResolvedBookingCoachSelection> => {
  const result = await resolveStrategyLead(input);
  return {
    assignedCoachId: result.assignedCoachId,
    coCoachUserIds: [],
  };
};

// Security model: possession of a preferredCoachId doesn't necessarily mean the
// assignment must be pinned — see the ROUND_ROBIN branch below.
const resolveSingleHostSelection = async (
  input: ResolveBookingCoachSelectionInput,
): Promise<ResolvedBookingCoachSelection> => {
  if (!input.preferredCoachId) {
    return resolveViaStrategyLead(input);
  }

  if (input.event.assignmentStrategy !== AssignmentStrategy.ROUND_ROBIN) {
    // DIRECT (or an explicit fixed-lead pin): the assignment is a deliberate
    // binding, not an interchangeable pool — no fallback if the pinned coach
    // is unavailable.
    return resolvePreferredSingleHost({ ...input, preferredCoachId: input.preferredCoachId });
  }

  // ROUND_ROBIN: prefer the previously-assigned coach if still genuinely
  // available (excludeBookingId means their own prior record at this booking
  // no longer counts against them) — this keeps a rescheduled/follow-up
  // session with the same coach when nothing actually has to change. But the
  // pool is interchangeable by design, so if they're genuinely busy with
  // something else, fall back to the round-robin strategy (tries every
  // eligible coach, same as a brand-new booking) instead of failing outright.
  const preferredHost = input.activeCoaches.find(
    (candidate) => candidate.coachUserId === input.preferredCoachId,
  );
  const preferredAvailable =
    preferredHost !== undefined &&
    (await isHostAvailable({
      coachUserId: input.preferredCoachId,
      event: input.event,
      start: input.start,
      end: input.end,
      allowSharedSessionOverlap: input.allowSharedSessionOverlap,
      matchedScheduleSlotId: input.matchedScheduleSlotId,
      excludeBookingId: input.excludeBookingId,
      tx: input.tx,
      coachDataMap: input.coachDataMap,
    }));

  if (preferredHost && preferredAvailable) {
    return {
      assignedCoachId: input.preferredCoachId,
      coCoachUserIds: [],
    };
  }

  return resolveViaStrategyLead(input);
};

const resolveFixedLeadSelection = async (
  input: Omit<ResolveBookingCoachSelectionInput, "preferredCoachId">,
): Promise<{ assignedCoachId: string }> => {
  const fixedLeadCoachId = input.event.fixedLeadCoachId ?? undefined;

  if (!fixedLeadCoachId) {
    throw new ErrorHandler(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Event configured for FIXED_LEAD but no lead coach is set.",
    );
  }

  const fixedLeadHost = input.activeCoaches.find(
    (candidate) => candidate.coachUserId === fixedLeadCoachId,
  );
  if (!fixedLeadHost) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "The fixed lead coach is no longer eligible for this event.",
    );
  }

  await assertHostAvailability({
    coachUserId: fixedLeadCoachId,
    event: input.event,
    start: input.start,
    end: input.end,
    allowSharedSessionOverlap: input.allowSharedSessionOverlap,
    matchedScheduleSlotId: input.matchedScheduleSlotId,
    excludeBookingId: input.excludeBookingId,
    tx: input.tx,
    coachDataMap: input.coachDataMap,
    unavailableMessage: "The fixed lead coach is not available at this time.",
  });

  return {
    assignedCoachId: fixedLeadCoachId,
  };
};

const resolveCollaborativeCoHosts = async ({
  activeCoaches,
  leadCoachId,
  event,
  start,
  end,
  allowSharedSessionOverlap,
  matchedScheduleSlotId,
  excludeBookingId,
  tx,
  coachDataMap,
}: Omit<ResolveBookingCoachSelectionInput, "preferredCoachId"> & {
  leadCoachId: string;
}): Promise<string[]> => {
  const candidatesCount = activeCoaches.length;
  if (candidatesCount <= 1) return [];

  const routingState = await getRoutingState(tx, event.id);
  const sortedCandidates = [...activeCoaches].sort((a, b) => a.coachOrder - b.coachOrder);
  const maxOrder = Math.max(...sortedCandidates.map((c) => c.coachOrder));

  // Determine where to start searching based on the nextCoachOrder cursor
  let startIndex = sortedCandidates.findIndex((c) => c.coachOrder >= routingState.nextCoachOrder);
  if (startIndex === -1) startIndex = 0;

  const availableCoHosts: string[] = [];
  const targetCount = event.targetCoHostCount ?? null;

  const context = buildAssignmentContext({
    event,
    start,
    end,
    allowSharedSessionOverlap,
    matchedScheduleSlotId,
    excludeBookingId,
    tx,
    coachDataMap,
  });

  for (let i = 0; i < candidatesCount; i++) {
    const index = (startIndex + i) % candidatesCount;
    const candidate = sortedCandidates[index];

    // Skip the lead coach
    if (candidate.coachUserId === leadCoachId) continue;

    // Check if we already have enough co-hosts
    if (targetCount !== null && availableCoHosts.length >= targetCount) break;

    const prefetch = coachDataMap?.get(candidate.coachUserId);
    const coHostOverride = prefetch
      ? prefetch.weeklyOverride
      : event.bookingMode !== "FIXED_SLOTS"
        ? await tx.eventCoachWeeklyAvailability.findMany({
            where: { eventId: event.id, coachUserId: candidate.coachUserId },
            select: { dayOfWeek: true, startTime: true, endTime: true },
          })
        : [];

    const isAvailable = await isCoachAvailable(
      candidate.coachUserId,
      start,
      end,
      {
        ...buildAvailabilityOptions({ event, allowSharedSessionOverlap, matchedScheduleSlotId, excludeBookingId, tx }),
        weeklyOverride: coHostOverride,
        ...(prefetch && {
          timezone: prefetch.timezone,
          calendarData: prefetch.calendarData,
          prefetchedConflicts: prefetch.prefetchedConflicts,
        }),
      },
    );

    if (isAvailable) {
      availableCoHosts.push(candidate.coachUserId);
      // Advance the core rotation cursor every time a co-host is assigned.
      // This ensures fair workload distribution even if the Lead is fixed.
      await updateRoutingState(context, candidate.coachOrder, maxOrder);
    }
  }

  // Graceful degradation logic remains unchanged...
  const coHostPoolSize = candidatesCount - 1;
  if (coHostPoolSize > 0 && availableCoHosts.length === 0) {
    getRequestLogger().warn(
      { eventId: event.id, startTime: start.toISOString(), candidatesChecked: coHostPoolSize, leadCoachId },
      "No co-hosts available for session — proceeding with lead only.",
    );
  }

  return availableCoHosts;
};

export const resolveBookingCoachSelection = async (
  input: ResolveBookingCoachSelectionInput,
): Promise<ResolvedBookingCoachSelection> => {
  const { event, tx, start } = input;
  const isDirect = event.assignmentStrategy === AssignmentStrategy.DIRECT;
  const caps = INTERACTION_TYPE_CAPS[event.interactionType as InteractionType];

  // Anonymous booking: no coach assigned to the booking.
  if (event.allowAnonymousBooking) {
    return {
      assignedCoachId: null,
      coCoachUserIds: [],
    };
  }

  // 1. Group Session Consistency: If multiple participants are allowed, check if a session
  // is already established for this slot. Reuse the existing coaching team if so.
  if (caps.multipleParticipants) {
    const existingSession = await tx.booking.findFirst({
      where: {
        eventId: event.id,
        startTime: start,
        status: { not: BookingStatus.CANCELLED },
      },
      select: {
        coachUserId: true,
        coCoachUserIds: true,
      },
    });

    if (existingSession) {
      // For FIXED_SLOTS, the slot's assignedCoachId is authoritative. If an admin has overridden
      // the slot's coach after initial bookings were made, new bookings must use the new coach —
      // not copy the old coach from an existing booking.
      if (event.bookingMode === "FIXED_SLOTS" && input.matchedScheduleSlotId) {
        const slot = await tx.eventScheduleSlot.findUnique({
          where: { id: input.matchedScheduleSlotId },
          select: { assignedCoachId: true },
        });
        if (slot?.assignedCoachId) {
          return {
            assignedCoachId: slot.assignedCoachId,
            coCoachUserIds: existingSession.coCoachUserIds,
          };
        }
      }

      return {
        assignedCoachId: existingSession.coachUserId,
        coCoachUserIds: existingSession.coCoachUserIds,
      };
    }
  }

  if (
    event.sessionLeadershipStrategy === SessionLeadershipStrategy.SINGLE_COACH ||
    (event.sessionLeadershipStrategy as string) === "SINGLE_HOST"
  ) {
    // 2. If we have a matched schedule slot with an assigned coach, override everything else
    if (input.matchedScheduleSlotId) {
      const slot = await tx.eventScheduleSlot.findUnique({
        where: { id: input.matchedScheduleSlotId },
        select: { assignedCoachId: true },
      });

      if (slot?.assignedCoachId) {
        return {
          assignedCoachId: slot.assignedCoachId,
          coCoachUserIds: [],
        };
      }
    }

    // Batch-fetch availability data for the pool before any candidate probing —
    // built here (after the slot-assigned early return) so fixed-slot bookings
    // with a pre-assigned coach don't pay for it.
    const singleHostInput = { ...input, coachDataMap: await buildCoachDataMap(input) };

    // 2. Fallback to DIRECT events logic...
    if (isDirect && event.fixedLeadCoachId && !input.preferredCoachId) {
      return resolveSingleHostSelection({
        ...singleHostInput,
        preferredCoachId: event.fixedLeadCoachId,
      });
    }
    return resolveSingleHostSelection(singleHostInput);
  }

  // Multi-coach session: determine lead coach.
  // FIXED_LEAD leadership OR DIRECT strategy with a designated coach both pin the lead.
  // Batch-fetch availability data once — the lead selection and co-host loop below
  // probe many candidates and would otherwise fire ~4 queries per coach.
  const multiCoachInput = { ...input, coachDataMap: await buildCoachDataMap(input) };
  const useFixedLead =
    event.sessionLeadershipStrategy === SessionLeadershipStrategy.FIXED_LEAD ||
    (isDirect && !!event.fixedLeadCoachId);

  const leadSelection = useFixedLead
    ? await resolveFixedLeadSelection(multiCoachInput)
    : await resolveStrategyLead(multiCoachInput);

  return {
    assignedCoachId: leadSelection.assignedCoachId,
    coCoachUserIds: await resolveCollaborativeCoHosts({
      ...multiCoachInput,
      leadCoachId: leadSelection.assignedCoachId,
    }),
  };
};
