import { AssignmentStrategy, BookingStatus, Prisma, UserRole } from "@prisma/client";
import { getManagedTeam } from "../../shared/utils/teamAccess";
import type { CallerContext } from "../../shared/utils/userUtils";
import {
  buildDateFilter,
  buildStatsResponse,
  requireAdmin,
  resolveTimeframe,
  type ResolvedTimeframe,
  type StatsResponse,
} from "./stats.shared";
import type { StatsRepository } from "./stats.repository";

export type { StatsTimeframeKey } from "./stats.shared";

export const createStatsService = (statsRepo: StatsRepository) => {
  const resolveTopCoachMetric = async (
    bookingWhere: Prisma.BookingWhereInput,
  ): Promise<{ id: string; name: string; count: number } | null> => {
    const coachGroup = await statsRepo.topCoachGroup(bookingWhere);

    if (coachGroup.length === 0 || !coachGroup[0].coachUserId) {
      return null;
    }

    const topCoach = await statsRepo.findUserById(coachGroup[0].coachUserId);

    if (!topCoach) {
      return null;
    }

    return {
      id: topCoach.id,
      name: `${topCoach.firstName} ${topCoach.lastName}`,
      count: coachGroup[0]._count._all,
    };
  };

  const resolveTopTeamMetric = async (
    bookingWhere: Prisma.BookingWhereInput,
  ): Promise<{ id: string; name: string; count: number } | null> => {
    const teamGroup = await statsRepo.topTeamGroup(bookingWhere);

    if (teamGroup.length === 0 || !teamGroup[0].teamId) {
      return null;
    }

    const topTeam = await statsRepo.findTeamById(teamGroup[0].teamId);

    if (!topTeam) {
      return null;
    }

    return {
      id: topTeam.id,
      name: topTeam.name,
      count: teamGroup[0]._count._all,
    };
  };

  const buildBookingWhere = (
    caller: CallerContext,
    timeframe: ResolvedTimeframe,
  ): Prisma.BookingWhereInput => {
    const dateFilter = buildDateFilter(timeframe);

    return {
      ...(caller.role === UserRole.COACH ? { coachUserId: caller.id } : {}),
      ...(dateFilter ? { startTime: dateFilter } : {}),
    };
  };

  const buildUpcomingBookingWhere = (
    caller: CallerContext,
    timeframe: ResolvedTimeframe,
  ): Prisma.BookingWhereInput => {
    const now = new Date();
    const dateFilter = buildDateFilter(timeframe);

    return {
      ...(caller.role === UserRole.COACH ? { coachUserId: caller.id } : {}),
      status: BookingStatus.CONFIRMED,
      startTime: {
        ...(dateFilter ?? {}),
        gte: now,
      },
    };
  };

  const getBookingStats = async (
    caller: CallerContext,
    timeframeRaw?: string,
  ): Promise<
    StatsResponse<{
      totalBookings: number;
      upcomingBookings: number;
      completedBookings: number;
      cancelledBookings: number;
      sessionsConducted: number;
      mostBookedCoach?: { id: string; name: string; count: number } | null;
      mostBookedTeam?: { id: string; name: string; count: number } | null;
    }>
  > => {
    const timeframe = resolveTimeframe(timeframeRaw);
    const bookingWhere = buildBookingWhere(caller, timeframe);
    const completedWhere = { ...bookingWhere, status: BookingStatus.COMPLETED };

    const upcomingWhere = buildUpcomingBookingWhere(caller, timeframe);

    const [totalBookings, completedBookings, cancelledBookings] = await Promise.all([
      statsRepo.countBookings(bookingWhere),
      statsRepo.countBookings(completedWhere),
      statsRepo.countBookings({ ...bookingWhere, status: BookingStatus.CANCELLED }),
    ]);

    // Both upcomingBookings and sessionsConducted apply the same slot-dedup logic:
    // a ONE_TO_MANY slot with N students = 1 session, not N.
    const [upcomingSlotSessions, upcomingIndividual, completedSlotSessions, completedIndividual] =
      await Promise.all([
        statsRepo.groupBookingsBySlot({ ...upcomingWhere, scheduleSlotId: { not: null } }),
        statsRepo.countBookings({ ...upcomingWhere, scheduleSlotId: null }),
        statsRepo.groupBookingsBySlot({ ...completedWhere, scheduleSlotId: { not: null } }),
        statsRepo.countBookings({ ...completedWhere, scheduleSlotId: null }),
      ]);

    const upcomingBookings = upcomingSlotSessions.length + upcomingIndividual;
    const sessionsConducted = completedSlotSessions.length + completedIndividual;

    const [mostBookedCoach, mostBookedTeam] =
      totalBookings > 0
        ? await Promise.all([
            resolveTopCoachMetric(bookingWhere),
            caller.role !== UserRole.COACH
              ? resolveTopTeamMetric(bookingWhere)
              : Promise.resolve(null),
          ])
        : [null, null];

    return buildStatsResponse(timeframe, {
      totalBookings,
      upcomingBookings,
      completedBookings,
      cancelledBookings,
      sessionsConducted,
      ...(mostBookedCoach ? { mostBookedCoach } : {}),
      ...(mostBookedTeam ? { mostBookedTeam } : {}),
    });
  };

  const getUserStats = async (
    caller: CallerContext,
    timeframeRaw?: string,
  ): Promise<
    StatsResponse<{
      newUsers: number;
      activeUsers: number;
      pendingInvites: number;
      coaches: number;
    }>
  > => {
    requireAdmin(caller);
    const timeframe = resolveTimeframe(timeframeRaw);
    const createdAt = buildDateFilter(timeframe);
    const now = new Date();

    const [newUsers, activeUsers, pendingInvites, coaches] = await Promise.all([
      statsRepo.countUsers(createdAt ? { createdAt } : undefined),
      statsRepo.countUsers({ isActive: true }),
      statsRepo.countInvites({ acceptedAt: null, expiresAt: { gte: now } }),
      statsRepo.countUsers({ role: UserRole.COACH, isActive: true }),
    ]);

    return buildStatsResponse(timeframe, {
      newUsers,
      activeUsers,
      pendingInvites,
      coaches,
    });
  };

  const getTeamStats = async (
    caller: CallerContext,
    timeframeRaw?: string,
  ): Promise<
    StatsResponse<{
      newTeams: number;
      activeTeams: number;
      activeMembers: number;
      teamsWithEvents: number;
    }>
  > => {
    requireAdmin(caller);
    const timeframe = resolveTimeframe(timeframeRaw);
    const createdAt = buildDateFilter(timeframe);

    const [newTeams, activeTeams, activeMembers, teamsWithEvents] = await Promise.all([
      statsRepo.countTeams({ deletedAt: null, ...(createdAt ? { createdAt } : {}) }),
      statsRepo.countTeams({ isActive: true, deletedAt: null }),
      statsRepo.countTeamMembers({ isActive: true }),
      statsRepo.countTeams({ events: { some: {} }, deletedAt: null }),
    ]);

    return buildStatsResponse(timeframe, {
      newTeams,
      activeTeams,
      activeMembers,
      teamsWithEvents,
    });
  };

  const getEventStats = async (
    caller: CallerContext,
    timeframeRaw?: string,
    teamId?: string,
  ): Promise<
    StatsResponse<{
      newEvents: number;
      activeEvents: number;
      roundRobinEvents: number;
      coachedEvents: number;
    }>
  > => {
    requireAdmin(caller);

    if (teamId?.trim() && caller.role === UserRole.TEAM_ADMIN) {
      await getManagedTeam(teamId, caller, { allowInactive: true });
    }

    const timeframe = resolveTimeframe(timeframeRaw);
    const createdAt = buildDateFilter(timeframe);
    const scopedWhere: Prisma.EventWhereInput = teamId?.trim() ? { teamId } : {};

    const [newEvents, activeEvents, roundRobinEvents, coachedEvents] = await Promise.all([
      statsRepo.countEvents({
        ...scopedWhere,
        deletedAt: null,
        ...(createdAt ? { createdAt } : {}),
      }),
      statsRepo.countEvents({ ...scopedWhere, isActive: true, deletedAt: null }),
      statsRepo.countEvents({
        ...scopedWhere,
        assignmentStrategy: AssignmentStrategy.ROUND_ROBIN,
        deletedAt: null,
      }),
      statsRepo.countEvents({
        ...scopedWhere,
        coaches: { some: { isActive: true } },
        deletedAt: null,
      }),
    ]);

    return buildStatsResponse(timeframe, {
      newEvents,
      activeEvents,
      roundRobinEvents,
      coachedEvents,
    });
  };

  const getEventTypeStats = async (
    caller: CallerContext,
    timeframeRaw?: string,
  ): Promise<
    StatsResponse<{
      newEventTypes: number;
      activeEventTypes: number;
      eventTypesInUse: number;
      unusedEventTypes: number;
    }>
  > => {
    requireAdmin(caller);
    const timeframe = resolveTimeframe(timeframeRaw);
    const createdAt = buildDateFilter(timeframe);

    const [newEventTypes, activeEventTypes, eventTypesInUse, unusedEventTypes] = await Promise.all([
      statsRepo.countEventTypes(createdAt ? { createdAt } : undefined),
      statsRepo.countEventTypes({ isActive: true }),
      statsRepo.countEventTypes({ events: { some: {} } }),
      statsRepo.countEventTypes({ events: { none: {} } }),
    ]);

    return buildStatsResponse(timeframe, {
      newEventTypes,
      activeEventTypes,
      eventTypesInUse,
      unusedEventTypes,
    });
  };

  const getInteractionTypeStats = async (
    caller: CallerContext,
    timeframeRaw?: string,
  ): Promise<
    StatsResponse<{
      newInteractionTypes: number;
      activeInteractionTypes: number;
      multiCoachEnabled: number;
      roundRobinEnabled: number;
    }>
  > => {
    requireAdmin(caller);
    const timeframe = resolveTimeframe(timeframeRaw);

    // Interaction types are now hardcoded constants — no DB query needed.
    return buildStatsResponse(timeframe, {
      newInteractionTypes: 0,
      activeInteractionTypes: 4,
      multiCoachEnabled: 2, // MANY_TO_ONE, MANY_TO_MANY
      roundRobinEnabled: 4, // all interaction types support ROUND_ROBIN
    });
  };

  const getDashboardStats = async (
    caller: CallerContext,
    timeframeRaw?: string,
  ): Promise<
    StatsResponse<{
      scheduledBookings: number;
      upcomingBookings: number;
      activeUsers: number;
      activeEvents: number;
      activeTeams: number;
    }>
  > => {
    const timeframe = resolveTimeframe(timeframeRaw);
    const bookingWhere = buildBookingWhere(caller, timeframe);
    const upcomingWhere = buildUpcomingBookingWhere(caller, timeframe);

    const activeEventsWhere: Prisma.EventWhereInput =
      caller.role === UserRole.COACH
        ? { coaches: { some: { coachUserId: caller.id, isActive: true } }, isActive: true }
        : { isActive: true };

    const activeTeamsPromise =
      caller.role === UserRole.COACH
        ? statsRepo
            .findDistinctEventTeamIds({
              coaches: { some: { coachUserId: caller.id, isActive: true } },
            })
            .then((teams) => teams.length)
        : statsRepo.countTeams({ isActive: true });

    const [
      scheduledBookings,
      upcomingSlotSessions,
      upcomingIndividual,
      activeUsers,
      activeEvents,
      activeTeams,
    ] = await Promise.all([
      statsRepo.countBookings(bookingWhere),
      statsRepo.groupBookingsBySlot({ ...upcomingWhere, scheduleSlotId: { not: null } }),
      statsRepo.countBookings({ ...upcomingWhere, scheduleSlotId: null }),
      statsRepo.countUsers({ isActive: true }),
      statsRepo.countEvents(activeEventsWhere),
      activeTeamsPromise,
    ]);

    const upcomingBookings = upcomingSlotSessions.length + upcomingIndividual;

    return buildStatsResponse(timeframe, {
      scheduledBookings,
      upcomingBookings,
      activeUsers,
      activeEvents,
      activeTeams,
    });
  };

  const getBookingTrends = async (
    caller: CallerContext,
    timeframeRaw?: string,
  ): Promise<
    StatsResponse<{
      trends: {
        date: string;
        count: number;
        completed: number;
        noShow: number;
        cancelled: number;
      }[];
    }>
  > => {
    const timeframe = resolveTimeframe(timeframeRaw);
    const bookingWhere = buildBookingWhere(caller, timeframe);

    const bookings = await statsRepo.findBookingStartsWithStatus(bookingWhere);

    const trendsMap = new Map<
      string,
      { date: string; count: number; completed: number; noShow: number; cancelled: number }
    >();

    if (timeframe.start && timeframe.end) {
      const curr = new Date(timeframe.start);
      while (curr <= timeframe.end) {
        const dateStr = curr.toISOString().split("T")[0];
        trendsMap.set(dateStr, { date: dateStr, count: 0, completed: 0, noShow: 0, cancelled: 0 });
        curr.setDate(curr.getDate() + 1);
      }
    }

    bookings.forEach((b) => {
      const dateStr = b.startTime.toISOString().split("T")[0];
      const entry = trendsMap.get(dateStr) || {
        date: dateStr,
        count: 0,
        completed: 0,
        noShow: 0,
        cancelled: 0,
      };

      entry.count++;
      if (b.status === BookingStatus.COMPLETED) entry.completed++;
      if (b.status === BookingStatus.NO_SHOW) entry.noShow++;
      if (b.status === BookingStatus.CANCELLED) entry.cancelled++;

      trendsMap.set(dateStr, entry);
    });

    const trends = Array.from(trendsMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return buildStatsResponse(timeframe, { trends });
  };

  const getTeamPerformance = async (
    caller: CallerContext,
    timeframeRaw?: string,
  ): Promise<
    StatsResponse<{
      performance: {
        teamId: string;
        name: string;
        total: number;
        completed: number;
        cancelled: number;
        noShow: number;
      }[];
    }>
  > => {
    requireAdmin(caller);
    const timeframe = resolveTimeframe(timeframeRaw);
    const bookingWhere = buildBookingWhere(caller, timeframe);

    const [teams, bookingGroups] = await Promise.all([
      statsRepo.findTeamNames({ isActive: true }),
      statsRepo.groupBookingsByTeamAndStatus(bookingWhere),
    ]);

    const teamBookingMap = new Map<
      string,
      { total: number; completed: number; cancelled: number; noShow: number }
    >();
    for (const row of bookingGroups) {
      const entry = teamBookingMap.get(row.teamId) ?? {
        total: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
      };
      const n = row._count.id;
      entry.total += n;
      if (row.status === BookingStatus.COMPLETED) entry.completed += n;
      if (row.status === BookingStatus.CANCELLED) entry.cancelled += n;
      if (row.status === BookingStatus.NO_SHOW) entry.noShow += n;
      teamBookingMap.set(row.teamId, entry);
    }

    const performance = teams
      .map((team) => {
        const counts = teamBookingMap.get(team.id) ?? {
          total: 0,
          completed: 0,
          cancelled: 0,
          noShow: 0,
        };
        return { teamId: team.id, name: team.name, ...counts };
      })
      .sort((a, b) => b.total - a.total);

    return buildStatsResponse(timeframe, { performance });
  };

  const getPeakActivity = async (
    caller: CallerContext,
    timeframeRaw?: string,
  ): Promise<
    StatsResponse<{
      activity: { hour: number; count: number }[];
    }>
  > => {
    const timeframe = resolveTimeframe(timeframeRaw);
    const bookingWhere = buildBookingWhere(caller, timeframe);

    const bookings = await statsRepo.findBookingStarts(bookingWhere);

    const hourMap = new Map<number, number>();
    for (let i = 0; i < 24; i++) hourMap.set(i, 0);

    bookings.forEach((b) => {
      const hour = b.startTime.getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    });

    const activity = Array.from(hourMap.entries())
      .map(([hour, count]) => ({
        hour,
        count,
      }))
      .sort((a, b) => a.hour - b.hour);

    return buildStatsResponse(timeframe, { activity });
  };

  return {
    getBookingStats,
    getUserStats,
    getTeamStats,
    getEventStats,
    getEventTypeStats,
    getInteractionTypeStats,
    getDashboardStats,
    getBookingTrends,
    getTeamPerformance,
    getPeakActivity,
  };
};

export type StatsService = ReturnType<typeof createStatsService>;
