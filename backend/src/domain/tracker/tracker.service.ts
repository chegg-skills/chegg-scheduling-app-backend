import { InteractionType, UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import type { CallerContext } from "../../shared/utils/userUtils";

// Extensibility point — add interaction types here to include them in the tracker
const TRACKER_INTERACTION_TYPES: InteractionType[] = [InteractionType.ONE_TO_MANY];

export interface TrackerSlot {
  slotId: string;
  startTime: Date;
  endTime: Date;
  team: { id: string; name: string };
  event: { id: string; name: string };
  eventType: { id: string; name: string } | null;
  seriesFrequency: string | null;
  seriesSessionNumber: number | null;
  seriesTotalCount: number | null;
  assignedCoach: { id: string; firstName: string; lastName: string } | null;
  bookingCount: number;
  capacity: number | null;
  remainingSeats: number | null;
  status: "OPEN" | "FULL";
  isLogged: boolean;
  summary: string | null;
  coachNotes: string | null;
  attendedCount: number | null;
}

export interface TrackerFilters {
  teams: { id: string; name: string }[];
  events: { id: string; name: string; teamId: string }[];
}

const requireTrackerAccess = (caller: CallerContext): void => {
  if (caller.role !== UserRole.SUPER_ADMIN && caller.role !== UserRole.TEAM_ADMIN) {
    throw new ErrorHandler(StatusCodes.FORBIDDEN, "You are not authorized to access the tracker.");
  }
};

export const getTrackerSlots = async (
  caller: CallerContext,
  filters: { date?: string; startDate?: string; endDate?: string; teamId?: string; eventId?: string },
): Promise<TrackerSlot[]> => {
  requireTrackerAccess(caller);

  let start: Date;
  let end: Date;

  if (filters.startDate && filters.endDate) {
    start = new Date(`${filters.startDate}T00:00:00.000`);
    end = new Date(`${filters.endDate}T23:59:59.999`);
  } else {
    const now = new Date();
    const targetDate =
      filters.date ??
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    start = new Date(`${targetDate}T00:00:00.000`);
    end = new Date(`${targetDate}T23:59:59.999`);
  }

  const slots = await prisma.eventScheduleSlot.findMany({
    where: {
      isCancelled: false,
      startTime: { gte: start, lte: end },
      ...(filters.eventId ? { eventId: filters.eventId } : {}),
      event: {
        deletedAt: null,
        isActive: true,
        interactionType: { in: TRACKER_INTERACTION_TYPES },
        ...(filters.teamId ? { teamId: filters.teamId } : {}),
        team: {
          deletedAt: null,
          ...(caller.role === UserRole.TEAM_ADMIN ? { teamLeadId: caller.id } : {}),
        },
      },
    },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          maxParticipantCount: true,
          teamId: true,
          team: { select: { id: true, name: true } },
          eventType: { select: { id: true, name: true } },
        },
      },
      assignedCoach: { select: { id: true, firstName: true, lastName: true } },
      recurrenceGroup: { select: { id: true, frequency: true } },
      sessionLog: {
        select: {
          id: true,
          summary: true,
          coachNotes: true,
          attendance: {
            select: {
              attended: true,
            },
          },
        },
      },
      _count: { select: { bookings: { where: { status: { not: "CANCELLED" } } } } },
    },
    orderBy: { startTime: "asc" },
  });

  // Compute absolute session number within each series
  const recurrenceGroupIds = slots
    .map((s) => s.recurrenceGroup?.id)
    .filter((id): id is string => !!id);

  const sessionPositionMap = new Map<string, { position: number; total: number }>();

  if (recurrenceGroupIds.length > 0) {
    const allGroupSlots = await prisma.eventScheduleSlot.findMany({
      where: { recurrenceGroupId: { in: recurrenceGroupIds }, isCancelled: false },
      select: { id: true, recurrenceGroupId: true },
      orderBy: { startTime: "asc" },
    });

    const byGroup = new Map<string, string[]>();
    for (const s of allGroupSlots) {
      if (!s.recurrenceGroupId) continue;
      if (!byGroup.has(s.recurrenceGroupId)) byGroup.set(s.recurrenceGroupId, []);
      byGroup.get(s.recurrenceGroupId)!.push(s.id);
    }

    for (const ids of byGroup.values()) {
      ids.forEach((id, idx) =>
        sessionPositionMap.set(id, { position: idx + 1, total: ids.length }),
      );
    }
  }

  return slots.map((slot) => {
    const bookingCount = slot._count.bookings;
    const capacity = slot.capacity ?? slot.event.maxParticipantCount ?? null;
    const remainingSeats = capacity !== null ? Math.max(0, capacity - bookingCount) : null;
    const status: "OPEN" | "FULL" =
      capacity !== null && bookingCount >= capacity ? "FULL" : "OPEN";
    const seriesPos = sessionPositionMap.get(slot.id) ?? null;

    return {
      slotId: slot.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      team: slot.event.team,
      event: { id: slot.event.id, name: slot.event.name },
      eventType: slot.event.eventType ?? null,
      seriesFrequency: slot.recurrenceGroup?.frequency ?? null,
      seriesSessionNumber: seriesPos?.position ?? null,
      seriesTotalCount: seriesPos?.total ?? null,
      isLogged: slot.sessionLog !== null,
      assignedCoach: slot.assignedCoach
        ? {
            id: slot.assignedCoach.id,
            firstName: slot.assignedCoach.firstName,
            lastName: slot.assignedCoach.lastName,
          }
        : null,
      bookingCount,
      capacity,
      remainingSeats,
      status,
      summary: slot.sessionLog?.summary ?? null,
      coachNotes: slot.sessionLog?.coachNotes ?? null,
      attendedCount: slot.sessionLog
        ? slot.sessionLog.attendance.filter((a) => a.attended).length
        : null,
    };
  });
};

export const getSessionDates = async (
  caller: CallerContext,
  filters: { startDate: string; endDate: string; teamId?: string; eventId?: string },
): Promise<{ dates: string[] }> => {
  requireTrackerAccess(caller);

  const rangeStart = new Date(`${filters.startDate}T00:00:00.000`);
  const rangeEnd = new Date(`${filters.endDate}T23:59:59.999`);

  const slots = await prisma.eventScheduleSlot.findMany({
    where: {
      isCancelled: false,
      startTime: { gte: rangeStart, lte: rangeEnd },
      ...(filters.eventId ? { eventId: filters.eventId } : {}),
      event: {
        deletedAt: null,
        isActive: true,
        interactionType: { in: TRACKER_INTERACTION_TYPES },
        ...(filters.teamId ? { teamId: filters.teamId } : {}),
        team: {
          deletedAt: null,
          ...(caller.role === UserRole.TEAM_ADMIN ? { teamLeadId: caller.id } : {}),
        },
      },
    },
    select: { startTime: true },
  });

  const toLocalDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const dates = [...new Set(slots.map((s) => toLocalDate(s.startTime)))];
  return { dates };
};

export const getTrackerFilters = async (
  caller: CallerContext,
): Promise<TrackerFilters> => {
  requireTrackerAccess(caller);

  const teamWhere =
    caller.role === UserRole.TEAM_ADMIN
      ? { teamLeadId: caller.id, deletedAt: null }
      : { deletedAt: null };

  const [teams, events] = await Promise.all([
    prisma.team.findMany({
      where: teamWhere,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.event.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        interactionType: { in: TRACKER_INTERACTION_TYPES },
        team: teamWhere,
      },
      select: { id: true, name: true, teamId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { teams, events };
};
