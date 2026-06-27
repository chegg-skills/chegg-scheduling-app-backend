import {
  EventBookingMode,
  Prisma,
  UserAvailabilityException,
  UserWeeklyAvailability,
} from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import {
  toLocalAvailabilityInfo,
  findAvailabilityException,
  isWithinWeeklyAvailability,
  resolveAvailabilityFromException,
  hhmmToMinutes,
  type LocalAvailabilityInfo,
} from "./availability.shared";

/**
 * True when the local start time falls inside any of the coach's windows for that
 * local day of week. Used for the cross-midnight trim heuristic where checking the
 * full (wrapped) session against a same-day window would misfire.
 */
function isStartWithinWindow(
  weekly: UserWeeklyAvailability[],
  startLocal: LocalAvailabilityInfo,
): boolean {
  const startMins = hhmmToMinutes(startLocal.hhmm);
  return weekly
    .filter((w) => w.dayOfWeek === startLocal.dayOfWeek)
    .some((w) => startMins >= hhmmToMinutes(w.startTime) && startMins < hhmmToMinutes(w.endTime));
}
import {
  evaluateCoachAvailability,
  endOfBookingWindowInTimezone,
} from "./availability.service";
import {
  filterConflictsForSlot,
  type BookingWithEventBuffer,
} from "./availabilityConflict.service";
import {
  assertBookingNoticeSatisfied,
  getEffectiveParticipantPolicy,
  replenishContinuousSlots,
} from "../events/eventScheduling.service";

/**
 * Per-coach availability diagnosis for a single slot. Mirrors the reasons the
 * production availability engine (`evaluateCoachAvailability` /
 * `getEffectiveParticipantPolicy`) uses to filter slots, so the admin debug
 * view explains exactly why a slot is or isn't shown to students.
 */
export type CoachSlotStatus =
  | { status: "available" }
  | { status: "conflict"; conflictingEvent: string; conflictStart: string; conflictEnd: string }
  | { status: "outside_availability"; windows: string[] }
  | { status: "exception_block" }
  | { status: "invalid_timezone" }
  | { status: "in_the_past" }
  | { status: "notice_window"; minimumNoticeMinutes: number }
  | { status: "booking_window"; maxBookingWindowDays: number }
  | { status: "recurrence_limit" }
  | { status: "capacity_full"; remaining: number };

export type SlotCoachDebug = {
  coachId: string;
  coachName: string;
  /** True for the coach(es) whose availability actually decides student visibility. */
  decidesVisibility: boolean;
  status: CoachSlotStatus;
};

export type SlotDebug = {
  startTime: string;
  endTime: string;
  scheduleSlotId?: string;
  /** Whether a student would currently see this slot on the public booking page. */
  visible: boolean;
  /** Event-wide block (past / notice / booking window / capacity / recurrence) — applies to all coaches. */
  eventLevelStatus: CoachSlotStatus | null;
  coaches: SlotCoachDebug[];
};

export type SlotDebugReport = {
  date: string;
  eventName: string;
  bookingMode: string;
  assignmentStrategy: string;
  totalSlots: number;
  visibleSlots: number;
  coaches: { id: string; name: string }[];
  slots: SlotDebug[];
};

const PAST_BUFFER_MS = 2 * 60 * 1000;

const debugEventInclude = Prisma.validator<Prisma.EventInclude>()({
  coaches: {
    where: { isActive: true },
    orderBy: { coachOrder: "asc" },
  },
});

/**
 * Produces a per-slot, per-coach availability breakdown for one calendar date,
 * exposing the reasons the public booking engine silently filters slots. Read-only
 * diagnostic — no booking state is mutated (it only calls `replenishContinuousSlots`,
 * the same idempotent pre-step `getAvailableSlots` runs).
 *
 * @param eventId  The event whose slots are being diagnosed.
 * @param date     Target calendar date as `"YYYY-MM-DD"` (interpreted as a UTC day,
 *                 mirroring `getAvailableSlots`' slot generation).
 * @param options  `timezone` anchors the booking-window boundary to the student's
 *                 local end-of-day (falls back to UTC when absent/invalid).
 * @throws {ErrorHandler} 404 when the event does not exist.
 */
export async function getSlotDebugReport(
  eventId: string,
  date: string,
  options: { timezone?: string } = {},
): Promise<SlotDebugReport> {
  // Same idempotent pre-step as getAvailableSlots so generated fixed slots exist.
  await replenishContinuousSlots(eventId);

  const dayStartUTC = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(dayStartUTC.getTime())) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Invalid date provided.");
  }
  const dayEndUTC = new Date(dayStartUTC.getTime() + 24 * 60 * 60 * 1000);

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      ...debugEventInclude,
      scheduleSlots: {
        where: {
          isActive: true,
          startTime: { gte: dayStartUTC, lt: dayEndUTC },
        },
        include: {
          assignedCoach: { select: { id: true, firstName: true, lastName: true } },
        } as Prisma.EventScheduleSlotInclude,
        orderBy: { startTime: "asc" },
      },
    },
  });

  if (!event) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Event not found.");
  }

  const e = event as any;
  const eligibleCoaches: Array<{ coachUserId: string }> = e.coaches;
  const coachIds = eligibleCoaches.map((c) => c.coachUserId);
  const isCoachAvailabilityMode = e.bookingMode !== EventBookingMode.FIXED_SLOTS;
  const allowShared = e.bookingMode === EventBookingMode.FIXED_SLOTS;

  // Booking-window boundary (same computation as getAvailableSlots).
  let windowEnd: Date | null = null;
  if (e.maxBookingWindowDays != null) {
    windowEnd = options.timezone
      ? endOfBookingWindowInTimezone(options.timezone, e.maxBookingWindowDays)
      : (() => {
          const d = new Date();
          d.setUTCDate(d.getUTCDate() + e.maxBookingWindowDays);
          d.setUTCHours(23, 59, 59, 999);
          return d;
        })();
  }

  // Coach names (+ timezones) for every coach in the pool.
  const coachUsers = await prisma.user.findMany({
    where: { id: { in: coachIds } },
    select: { id: true, firstName: true, lastName: true, timezone: true },
  });
  const nameMap = new Map<string, string>();
  const timezoneMap = new Map<string, string>();
  for (const u of coachUsers) {
    nameMap.set(u.id, `${u.firstName} ${u.lastName}`.trim());
    timezoneMap.set(u.id, u.timezone);
  }

  // Batch-prefetch calendar + conflict data for COACH_AVAILABILITY mode so the
  // per-coach × per-slot evaluation runs in-memory (mirrors getAvailableSlots).
  const weeklyMap = new Map<string, UserWeeklyAvailability[]>();
  const exceptionsMap = new Map<string, UserAvailabilityException[]>();
  const rawConflictsMap = new Map<string, BookingWithEventBuffer[]>();
  const overrideMap = new Map<string, Array<{ dayOfWeek: number; startTime: string; endTime: string }>>();

  if (isCoachAvailabilityMode && coachIds.length > 0) {
    const batchFetchEnd = new Date(
      dayEndUTC.getTime() + e.durationSeconds * 1000 + (e.bufferAfterMinutes ?? 0) * 60_000,
    );
    const lookbackStart = new Date(dayStartUTC.getTime() - 120 * 60 * 1000);

    const [weeklyRows, exceptionRows, overrides, conflictBookings, conflictSlots] = await Promise.all([
      prisma.userWeeklyAvailability.findMany({ where: { userId: { in: coachIds } } }),
      prisma.userAvailabilityException.findMany({
        where: { userId: { in: coachIds }, date: { gte: dayStartUTC, lte: batchFetchEnd } },
      }),
      prisma.eventCoachWeeklyAvailability.findMany({
        where: { eventId, coachUserId: { in: coachIds } },
      }),
      prisma.booking.findMany({
        where: {
          OR: [{ coachUserId: { in: coachIds } }, { coCoachUserIds: { hasSome: coachIds } }],
          status: { in: ["CONFIRMED", "PENDING"] },
          startTime: { lt: batchFetchEnd },
          endTime: { gt: lookbackStart },
        },
        include: { event: true },
      }) as Promise<BookingWithEventBuffer[]>,
      // Also pre-fetch fixed slot assignments — a coach is blocked as soon as they're
      // assigned to a slot, even before any student books.
      prisma.eventScheduleSlot.findMany({
        where: {
          assignedCoachId: { in: coachIds },
          isActive: true,
          isCancelled: false,
          startTime: { lt: batchFetchEnd },
          endTime: { gt: lookbackStart },
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          eventId: true,
          assignedCoachId: true,
          event: { select: { bufferAfterMinutes: true, name: true } },
        },
      }),
    ]);

    for (const r of weeklyRows) {
      const list = weeklyMap.get(r.userId) ?? [];
      list.push(r);
      weeklyMap.set(r.userId, list);
    }
    for (const r of exceptionRows) {
      const list = exceptionsMap.get(r.userId) ?? [];
      list.push(r);
      exceptionsMap.set(r.userId, list);
    }
    for (const o of overrides) {
      const list = overrideMap.get(o.coachUserId) ?? [];
      list.push({ dayOfWeek: o.dayOfWeek, startTime: o.startTime, endTime: o.endTime });
      overrideMap.set(o.coachUserId, list);
    }
    for (const b of conflictBookings) {
      if (b.coachUserId && coachIds.includes(b.coachUserId)) {
        const list = rawConflictsMap.get(b.coachUserId) ?? [];
        list.push(b);
        rawConflictsMap.set(b.coachUserId, list);
      }
      for (const ccId of (b as any).coCoachUserIds ?? []) {
        if (coachIds.includes(ccId)) {
          const list = rawConflictsMap.get(ccId) ?? [];
          list.push(b);
          rawConflictsMap.set(ccId, list);
        }
      }
    }
    for (const s of conflictSlots) {
      if (!s.assignedCoachId || !coachIds.includes(s.assignedCoachId)) continue;
      const shaped = {
        startTime: s.startTime,
        endTime: s.endTime,
        scheduleSlotId: s.id,
        eventId: s.eventId,
        event: { bufferAfterMinutes: s.event?.bufferAfterMinutes ?? null, name: s.event?.name ?? "Fixed Session" },
      } as unknown as BookingWithEventBuffer;
      const list = rawConflictsMap.get(s.assignedCoachId) ?? [];
      list.push(shaped);
      rawConflictsMap.set(s.assignedCoachId, list);
    }
  }

  // Recurrence visibility-limit filtering for FIXED_SLOTS (mirrors getAvailableSlots):
  // slots beyond a group's recurrenceVisibilityLimit are hidden from students.
  const recurrenceLimitedSlotIds = await computeRecurrenceLimitedSlotIds(e.scheduleSlots);

  /** Weekly windows for a coach on the slot's local day, e.g. ["09:00–17:00"]. */
  const computeWindows = (coachId: string, slotStart: Date): string[] => {
    const tz = timezoneMap.get(coachId);
    const weekly = weeklyMap.get(coachId);
    if (!tz || !weekly) return [];
    try {
      const local = toLocalAvailabilityInfo(slotStart, tz);
      return weekly
        .filter((w) => w.dayOfWeek === local.dayOfWeek)
        .map((w) => `${w.startTime}–${w.endTime}`);
    } catch {
      return [];
    }
  };

  /**
   * True when the slot falls inside at least one coach's availability window for
   * that day (weekly schedule, event-specific override, or a one-off availability
   * grant). Used to trim COACH_AVAILABILITY generation to the coaches' configured
   * hours instead of all 96 intervals of the day. Computed directly (not from the
   * evaluate result) because conflict detection short-circuits before the weekly
   * check, so a conflict outside hours would otherwise leak in.
   */
  const isSlotInAnyCoachWindow = (slotStart: Date, slotEnd: Date): boolean => {
    // Mirror evaluateCoachAvailability: the availability window must contain the
    // session plus its after-buffer, so boundary slots that only fail due to the
    // buffer are trimmed consistently with the verdict.
    const effectiveEnd = e.bufferAfterMinutes
      ? new Date(slotEnd.getTime() + e.bufferAfterMinutes * 60_000)
      : slotEnd;
    for (const coachId of coachIds) {
      const tz = timezoneMap.get(coachId);
      if (!tz) continue;
      let local0;
      let local1;
      try {
        local0 = toLocalAvailabilityInfo(slotStart, tz);
        local1 = toLocalAvailabilityInfo(effectiveEnd, tz);
      } catch {
        continue; // invalid coach timezone — skip
      }
      // Event-specific weekly override takes priority over the global weekly schedule.
      const override = overrideMap.get(coachId);
      const weekly =
        override && override.length
          ? (override as unknown as UserWeeklyAvailability[])
          : (weeklyMap.get(coachId) ?? []);
      const ex = findAvailabilityException(exceptionsMap.get(coachId) ?? [], local0.dateString);
      const exDecision = resolveAvailabilityFromException(ex, local0, local1);
      if (exDecision === true) return true; // one-off availability grant
      if (exDecision === false) continue; // blocked for this coach
      if (local0.dateString === local1.dateString) {
        // Same local day: the whole (buffered) session must fit inside a window.
        if (isWithinWeeklyAvailability(weekly, local0, local1)) return true;
      } else {
        // Cross-midnight: feeding the wrapped end (e.g. 00:15) into the same-day
        // window check yields false positives (endMins wraps to ~0 and passes any
        // window). Anchor on the start instead — the slot is in range only if its
        // start falls inside a window for that day. A genuine late-night window
        // (e.g. 22:00–23:59) still matches; a 09:00–14:00 window correctly rejects
        // a 23:00 start. evaluateCoachAvailability then produces the precise verdict.
        if (isStartWithinWindow(weekly, local0)) return true;
      }
    }
    return false;
  };

  const evaluateCoachForSlot = async (
    coachId: string,
    slotStart: Date,
    slotEnd: Date,
    scheduleSlot?: { id: string },
  ): Promise<CoachSlotStatus> => {
    const effectiveSlotEnd = e.bufferAfterMinutes
      ? new Date(slotEnd.getTime() + e.bufferAfterMinutes * 60_000)
      : slotEnd;

    const prefetch = isCoachAvailabilityMode
      ? {
          timezone: timezoneMap.get(coachId),
          calendarData: {
            weekly: weeklyMap.get(coachId) ?? [],
            exceptions: exceptionsMap.get(coachId) ?? [],
          },
          prefetchedConflicts: filterConflictsForSlot(
            rawConflictsMap.get(coachId) ?? [],
            slotStart,
            effectiveSlotEnd,
            {
              eventId: allowShared ? eventId : undefined,
              scheduleSlotId: allowShared ? (scheduleSlot?.id ?? null) : undefined,
            },
          ),
        }
      : {};

    const result = await evaluateCoachAvailability(coachId, slotStart, slotEnd, {
      ignoreWeeklySchedule: allowShared,
      weeklyOverride: overrideMap.get(coachId) ?? [],
      eventId: allowShared ? eventId : undefined,
      scheduleSlotId: allowShared ? (scheduleSlot?.id ?? null) : undefined,
      bufferAfterMinutes: e.bufferAfterMinutes,
      ...prefetch,
    });

    if (result.available) return { status: "available" };

    switch (result.reason) {
      case "conflict":
        return {
          status: "conflict",
          conflictingEvent: result.conflict?.event.name ?? "Existing booking",
          conflictStart: (result.conflict?.startTime ?? slotStart).toISOString(),
          conflictEnd: (result.conflict?.endTime ?? slotEnd).toISOString(),
        };
      case "exception_block":
        return { status: "exception_block" };
      case "invalid_timezone":
        return { status: "invalid_timezone" };
      case "outside_availability":
      default:
        return { status: "outside_availability", windows: computeWindows(coachId, slotStart) };
    }
  };

  /** Resolves a slot's event-level block (past / window / notice / recurrence / capacity), if any. */
  const resolveEventLevelStatus = async (
    slotStart: Date,
    scheduleSlot?: { id: string; capacity: number | null },
  ): Promise<CoachSlotStatus | null> => {
    if (slotStart.getTime() <= Date.now() + PAST_BUFFER_MS) {
      return { status: "in_the_past" };
    }
    if (windowEnd && slotStart >= windowEnd) {
      return { status: "booking_window", maxBookingWindowDays: e.maxBookingWindowDays };
    }
    try {
      assertBookingNoticeSatisfied(e.minimumNoticeMinutes, slotStart);
    } catch {
      return { status: "notice_window", minimumNoticeMinutes: e.minimumNoticeMinutes };
    }
    if (scheduleSlot && recurrenceLimitedSlotIds.has(scheduleSlot.id)) {
      return { status: "recurrence_limit" };
    }
    if (scheduleSlot) {
      const { maxParticipants } = getEffectiveParticipantPolicy(e, scheduleSlot);
      if (maxParticipants !== null) {
        const currentBookings = await prisma.booking.count({
          where: { scheduleSlotId: scheduleSlot.id, status: { not: "CANCELLED" } },
        });
        if (currentBookings >= maxParticipants) {
          return { status: "capacity_full", remaining: 0 };
        }
      }
    }
    return null;
  };

  /** Picks which coaches decide visibility and evaluates them, mirroring getSlotAvailability. */
  const buildSlotCoaches = async (
    slotStart: Date,
    slotEnd: Date,
    scheduleSlot?: { id: string; assignedCoachId: string | null },
  ): Promise<{ coaches: SlotCoachDebug[]; visible: boolean }> => {
    // Assigned-coach slot → only that coach decides and is shown.
    if (scheduleSlot?.assignedCoachId) {
      const id = scheduleSlot.assignedCoachId;
      const status = await evaluateCoachForSlot(id, slotStart, slotEnd, scheduleSlot);
      return {
        coaches: [
          { coachId: id, coachName: nameMap.get(id) ?? id, decidesVisibility: true, status },
        ],
        visible: status.status === "available",
      };
    }

    const evaluated: SlotCoachDebug[] = [];
    for (const coach of eligibleCoaches) {
      const status = await evaluateCoachForSlot(coach.coachUserId, slotStart, slotEnd, scheduleSlot);
      evaluated.push({
        coachId: coach.coachUserId,
        coachName: nameMap.get(coach.coachUserId) ?? coach.coachUserId,
        decidesVisibility: false,
        status,
      });
    }

    // DIRECT (no preferred coach) → only the primary coach decides visibility.
    if (e.assignmentStrategy === "DIRECT") {
      const primary = evaluated[0];
      if (primary) primary.decidesVisibility = true;
      return { coaches: evaluated, visible: primary?.status.status === "available" };
    }

    // Pool (ROUND_ROBIN / multi-coach) → visible if any coach is free.
    for (const c of evaluated) c.decidesVisibility = true;
    return { coaches: evaluated, visible: evaluated.some((c) => c.status.status === "available") };
  };

  const buildSlot = async (
    slotStart: Date,
    slotEnd: Date,
    scheduleSlot?: { id: string; assignedCoachId: string | null; capacity: number | null },
  ): Promise<SlotDebug> => {
    const eventLevelStatus = await resolveEventLevelStatus(slotStart, scheduleSlot);
    if (eventLevelStatus) {
      return {
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        scheduleSlotId: scheduleSlot?.id,
        visible: false,
        eventLevelStatus,
        coaches: [],
      };
    }
    const { coaches, visible } = await buildSlotCoaches(slotStart, slotEnd, scheduleSlot);
    return {
      startTime: slotStart.toISOString(),
      endTime: slotEnd.toISOString(),
      scheduleSlotId: scheduleSlot?.id,
      visible,
      eventLevelStatus: null,
      coaches,
    };
  };

  const slots: SlotDebug[] = [];

  if (e.bookingMode === EventBookingMode.FIXED_SLOTS) {
    for (const slot of e.scheduleSlots) {
      slots.push(
        await buildSlot(slot.startTime, slot.endTime, {
          id: slot.id,
          assignedCoachId: slot.assignedCoachId ?? null,
          capacity: slot.capacity ?? null,
        }),
      );
    }
  } else {
    const durationMs = e.durationSeconds * 1000;
    const intervalMs = 15 * 60 * 1000;
    for (let ms = 0; ms < 24 * 60 * 60 * 1000; ms += intervalMs) {
      const slotStart = new Date(dayStartUTC.getTime() + ms);
      const slotEnd = new Date(slotStart.getTime() + durationMs);
      // Trim to the coaches' configured hours: skip intervals outside every
      // coach's availability window so the admin sees the bookable range, not
      // all 96 intervals of the day. (Cheap pre-filter; the post-filter below
      // catches cross-midnight boundary cases the window check can't.)
      if (!isSlotInAnyCoachWindow(slotStart, slotEnd)) continue;
      const built = await buildSlot(slotStart, slotEnd);
      // Drop intervals where every coach is outside their availability window —
      // these are out-of-hours and carry no diagnostic value. Event-level blocks
      // (notice/window/past/capacity) and in-range blocks (conflict/exception)
      // are kept.
      const allOutsideHours =
        built.eventLevelStatus === null &&
        built.coaches.length > 0 &&
        built.coaches.every((c) => c.status.status === "outside_availability");
      if (allOutsideHours) continue;
      slots.push(built);
    }
  }

  return {
    date,
    eventName: e.name,
    bookingMode: e.bookingMode,
    assignmentStrategy: e.assignmentStrategy,
    totalSlots: slots.length,
    visibleSlots: slots.filter((s) => s.visible).length,
    coaches: coachIds.map((id) => ({ id, name: nameMap.get(id) ?? id })),
    slots,
  };
}

/**
 * Replicates getAvailableSlots' recurrence visibility-limit filtering: for each
 * recurrence group with a `recurrenceVisibilityLimit`, only the earliest N
 * upcoming non-cancelled slots are visible. Returns the set of slot ids on the
 * requested day that fall *outside* their group's visible window.
 */
async function computeRecurrenceLimitedSlotIds(
  daySlots: Array<{ id: string; recurrenceGroupId: string | null }>,
): Promise<Set<string>> {
  const limited = new Set<string>();
  const groupIds = Array.from(
    new Set(daySlots.map((s) => s.recurrenceGroupId).filter((id): id is string => id != null)),
  );
  if (groupIds.length === 0) return limited;

  const groups = await prisma.recurrenceGroup.findMany({
    where: { id: { in: groupIds } },
    select: { id: true, recurrenceVisibilityLimit: true },
  });

  const now = new Date();
  for (const g of groups) {
    if (g.recurrenceVisibilityLimit == null) continue;
    const visible = await prisma.eventScheduleSlot.findMany({
      where: {
        recurrenceGroupId: g.id,
        startTime: { gte: now },
        isCancelled: false,
        isActive: true,
      },
      orderBy: { startTime: "asc" },
      take: g.recurrenceVisibilityLimit,
      select: { id: true },
    });
    const visibleIds = new Set(visible.map((s) => s.id));
    for (const slot of daySlots) {
      if (slot.recurrenceGroupId === g.id && !visibleIds.has(slot.id)) {
        limited.add(slot.id);
      }
    }
  }
  return limited;
}
