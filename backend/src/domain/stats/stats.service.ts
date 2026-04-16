import { AssignmentStrategy, BookingStatus, Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
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

export type { StatsTimeframeKey } from "./stats.shared";

const resolveTopCoachMetric = async (
  bookingWhere: Prisma.BookingWhereInput,
): Promise<{ id: string; name: string; count: number } | null> => {
  const coachGroup = await prisma.booking.groupBy({
    by: ["hostUserId"],
    where: bookingWhere,
    _count: { _all: true },
    orderBy: { _count: { hostUserId: "desc" } },
    take: 1,
  });

  if (coachGroup.length === 0 || !coachGroup[0].hostUserId) {
    return null;
  }

  const topCoach = await prisma.user.findUnique({
    where: { id: coachGroup[0].hostUserId },
  });

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
  const teamGroup = await prisma.booking.groupBy({
    by: ["teamId"],
    where: bookingWhere,
    _count: { _all: true },
    orderBy: { _count: { teamId: "desc" } },
    take: 1,
  });

  if (teamGroup.length === 0 || !teamGroup[0].teamId) {
    return null;
  }

  const topTeam = await prisma.team.findUnique({
    where: { id: teamGroup[0].teamId },
  });

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
    ...(caller.role === UserRole.COACH ? { hostUserId: caller.id } : {}),
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
    ...(caller.role === UserRole.COACH ? { hostUserId: caller.id } : {}),
    status: BookingStatus.CONFIRMED,
    startTime: {
      ...(dateFilter ?? {}),
      gte: now,
    },
  };
};

export const getBookingStats = async (
  caller: CallerContext,
  timeframeRaw?: string,
): Promise<
  StatsResponse<{
    totalBookings: number;
    upcomingBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    mostBookedCoach?: { id: string; name: string; count: number } | null;
    mostBookedTeam?: { id: string; name: string; count: number } | null;
  }>
> => {
  const timeframe = resolveTimeframe(timeframeRaw);
  const bookingWhere = buildBookingWhere(caller, timeframe);

  const [totalBookings, upcomingBookings, completedBookings, cancelledBookings] = await Promise.all(
    [
      prisma.booking.count({ where: bookingWhere }),
      prisma.booking.count({ where: buildUpcomingBookingWhere(caller, timeframe) }),
      prisma.booking.count({ where: { ...bookingWhere, status: BookingStatus.COMPLETED } }),
      prisma.booking.count({ where: { ...bookingWhere, status: BookingStatus.CANCELLED } }),
    ],
  );

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
    ...(mostBookedCoach ? { mostBookedCoach } : {}),
    ...(mostBookedTeam ? { mostBookedTeam } : {}),
  });
};

export const getUserStats = async (
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
    prisma.user.count({ where: createdAt ? { createdAt } : undefined }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.userInvite.count({ where: { acceptedAt: null, expiresAt: { gte: now } } }),
    prisma.user.count({ where: { role: UserRole.COACH, isActive: true } }),
  ]);

  return buildStatsResponse(timeframe, {
    newUsers,
    activeUsers,
    pendingInvites,
    coaches,
  });
};

export const getTeamStats = async (
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
    prisma.team.count({ where: createdAt ? { createdAt } : undefined }),
    prisma.team.count({ where: { isActive: true } }),
    prisma.teamMember.count({ where: { isActive: true } }),
    prisma.team.count({ where: { events: { some: {} } } }),
  ]);

  return buildStatsResponse(timeframe, {
    newTeams,
    activeTeams,
    activeMembers,
    teamsWithEvents,
  });
};

export const getEventStats = async (
  caller: CallerContext,
  timeframeRaw?: string,
  teamId?: string,
): Promise<
  StatsResponse<{
    newEvents: number;
    activeEvents: number;
    roundRobinEvents: number;
    hostedEvents: number;
  }>
> => {
  requireAdmin(caller);

  if (teamId?.trim() && caller.role === UserRole.TEAM_ADMIN) {
    await getManagedTeam(teamId, caller, { allowInactive: true });
  }

  const timeframe = resolveTimeframe(timeframeRaw);
  const createdAt = buildDateFilter(timeframe);
  const scopedWhere: Prisma.EventWhereInput = teamId?.trim() ? { teamId } : {};

  const [newEvents, activeEvents, roundRobinEvents, hostedEvents] = await Promise.all([
    prisma.event.count({ where: { ...scopedWhere, ...(createdAt ? { createdAt } : {}) } }),
    prisma.event.count({ where: { ...scopedWhere, isActive: true } }),
    prisma.event.count({
      where: { ...scopedWhere, assignmentStrategy: AssignmentStrategy.ROUND_ROBIN },
    }),
    prisma.event.count({ where: { ...scopedWhere, hosts: { some: { isActive: true } } } }),
  ]);

  return buildStatsResponse(timeframe, {
    newEvents,
    activeEvents,
    roundRobinEvents,
    hostedEvents,
  });
};

export const getOfferingStats = async (
  caller: CallerContext,
  timeframeRaw?: string,
): Promise<
  StatsResponse<{
    newOfferings: number;
    activeOfferings: number;
    offeringsInUse: number;
    unusedOfferings: number;
  }>
> => {
  requireAdmin(caller);
  const timeframe = resolveTimeframe(timeframeRaw);
  const createdAt = buildDateFilter(timeframe);

  const [newOfferings, activeOfferings, offeringsInUse, unusedOfferings] = await Promise.all([
    prisma.eventOffering.count({ where: createdAt ? { createdAt } : undefined }),
    prisma.eventOffering.count({ where: { isActive: true } }),
    prisma.eventOffering.count({ where: { events: { some: {} } } }),
    prisma.eventOffering.count({ where: { events: { none: {} } } }),
  ]);

  return buildStatsResponse(timeframe, {
    newOfferings,
    activeOfferings,
    offeringsInUse,
    unusedOfferings,
  });
};

export const getInteractionTypeStats = async (
  caller: CallerContext,
  timeframeRaw?: string,
): Promise<
  StatsResponse<{
    newInteractionTypes: number;
    activeInteractionTypes: number;
    multiHostEnabled: number;
    roundRobinEnabled: number;
  }>
> => {
  requireAdmin(caller);
  const timeframe = resolveTimeframe(timeframeRaw);
  const createdAt = buildDateFilter(timeframe);

  const [newInteractionTypes, activeInteractionTypes, multiHostEnabled, roundRobinEnabled] =
    await Promise.all([
      prisma.eventInteractionType.count({ where: createdAt ? { createdAt } : undefined }),
      prisma.eventInteractionType.count({ where: { isActive: true } }),
      prisma.eventInteractionType.count({ where: { supportsMultipleHosts: true, isActive: true } }),
      prisma.eventInteractionType.count({ where: { supportsRoundRobin: true, isActive: true } }),
    ]);

  return buildStatsResponse(timeframe, {
    newInteractionTypes,
    activeInteractionTypes,
    multiHostEnabled,
    roundRobinEnabled,
  });
};

export const getDashboardStats = async (
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
      ? { hosts: { some: { hostUserId: caller.id, isActive: true } }, isActive: true }
      : { isActive: true };

  const activeTeamsPromise =
    caller.role === UserRole.COACH
      ? prisma.event
          .findMany({
            where: { hosts: { some: { hostUserId: caller.id, isActive: true } } },
            select: { teamId: true },
            distinct: ["teamId"],
          })
          .then((teams) => teams.length)
      : prisma.team.count({ where: { isActive: true } });

  const [scheduledBookings, upcomingBookings, activeUsers, activeEvents, activeTeams] =
    await Promise.all([
      prisma.booking.count({ where: bookingWhere }),
      prisma.booking.count({ where: upcomingWhere }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.event.count({ where: activeEventsWhere }),
      activeTeamsPromise,
    ]);

  return buildStatsResponse(timeframe, {
    scheduledBookings,
    upcomingBookings,
    activeUsers,
    activeEvents,
    activeTeams,
  });
};

export const getBookingTrends = async (
  caller: CallerContext,
  timeframeRaw?: string,
): Promise<
  StatsResponse<{
    trends: { date: string; count: number; completed: number; noShow: number; cancelled: number }[];
  }>
> => {
  const timeframe = resolveTimeframe(timeframeRaw);
  const bookingWhere = buildBookingWhere(caller, timeframe);

  const bookings = await prisma.booking.findMany({
    where: bookingWhere,
    select: {
      startTime: true,
      status: true,
    },
  });

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

export const getTeamPerformance = async (
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

  const teams = await prisma.team.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      bookings: {
        where: bookingWhere,
        select: {
          status: true,
        },
      },
    },
  });

  const performance = teams
    .map((team) => {
      const stats = {
        teamId: team.id,
        name: team.name,
        total: team.bookings.length,
        completed: 0,
        cancelled: 0,
        noShow: 0,
      };

      team.bookings.forEach((b) => {
        if (b.status === BookingStatus.COMPLETED) stats.completed++;
        if (b.status === BookingStatus.CANCELLED) stats.cancelled++;
        if (b.status === BookingStatus.NO_SHOW) stats.noShow++;
      });

      return stats;
    })
    .sort((a, b) => b.total - a.total);

  return buildStatsResponse(timeframe, { performance });
};

export const getPeakActivity = async (
  caller: CallerContext,
  timeframeRaw?: string,
): Promise<
  StatsResponse<{
    activity: { hour: number; count: number }[];
  }>
> => {
  const timeframe = resolveTimeframe(timeframeRaw);
  const bookingWhere = buildBookingWhere(caller, timeframe);

  const bookings = await prisma.booking.findMany({
    where: bookingWhere,
    select: {
      startTime: true,
    },
  });

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
