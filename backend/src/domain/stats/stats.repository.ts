import type { BookingStatus, Prisma, Team, User } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import type { DbClient } from "../../shared/db/repository";

/**
 * Thin, typed read primitives. Every `where` is built by the service from the caller's
 * role and the requested timeframe — the repository never decides what to filter.
 */
export interface StatsRepository {
  countBookings(where: Prisma.BookingWhereInput, tx?: DbClient): Promise<number>;
  /** One row per distinct slot; callers use the length to count sessions (slot dedup). */
  groupBookingsBySlot(
    where: Prisma.BookingWhereInput,
    tx?: DbClient,
  ): Promise<Array<{ scheduleSlotId: string | null }>>;
  /** Coach with the most bookings (at most one row). */
  topCoachGroup(
    where: Prisma.BookingWhereInput,
    tx?: DbClient,
  ): Promise<Array<{ coachUserId: string | null; _count: { _all: number } }>>;
  /** Team with the most bookings (at most one row). */
  topTeamGroup(
    where: Prisma.BookingWhereInput,
    tx?: DbClient,
  ): Promise<Array<{ teamId: string; _count: { _all: number } }>>;
  groupBookingsByTeamAndStatus(
    where: Prisma.BookingWhereInput,
    tx?: DbClient,
  ): Promise<Array<{ teamId: string; status: BookingStatus; _count: { id: number } }>>;
  findBookingStartsWithStatus(
    where: Prisma.BookingWhereInput,
    tx?: DbClient,
  ): Promise<Array<{ startTime: Date; status: BookingStatus }>>;
  findBookingStarts(
    where: Prisma.BookingWhereInput,
    tx?: DbClient,
  ): Promise<Array<{ startTime: Date }>>;

  findUserById(id: string, tx?: DbClient): Promise<User | null>;
  findTeamById(id: string, tx?: DbClient): Promise<Team | null>;
  findTeamNames(
    where: Prisma.TeamWhereInput,
    tx?: DbClient,
  ): Promise<Array<{ id: string; name: string }>>;
  findDistinctEventTeamIds(
    where: Prisma.EventWhereInput,
    tx?: DbClient,
  ): Promise<Array<{ teamId: string }>>;

  countUsers(where?: Prisma.UserWhereInput, tx?: DbClient): Promise<number>;
  countInvites(where: Prisma.UserInviteWhereInput, tx?: DbClient): Promise<number>;
  countTeams(where: Prisma.TeamWhereInput, tx?: DbClient): Promise<number>;
  countTeamMembers(where: Prisma.TeamMemberWhereInput, tx?: DbClient): Promise<number>;
  countEvents(where: Prisma.EventWhereInput, tx?: DbClient): Promise<number>;
  countEventTypes(where?: Prisma.EventTypeWhereInput, tx?: DbClient): Promise<number>;
}

export const createStatsRepo = (db: DbClient = prisma): StatsRepository => ({
  countBookings: (where, tx) => (tx ?? db).booking.count({ where }),

  groupBookingsBySlot: async (where, tx) => {
    const rows = await (tx ?? db).booking.groupBy({ by: ["scheduleSlotId"], where });
    return rows;
  },

  topCoachGroup: async (where, tx) => {
    const rows = await (tx ?? db).booking.groupBy({
      by: ["coachUserId"],
      where,
      _count: { _all: true },
      orderBy: { _count: { coachUserId: "desc" } },
      take: 1,
    });
    return rows;
  },

  topTeamGroup: async (where, tx) => {
    const rows = await (tx ?? db).booking.groupBy({
      by: ["teamId"],
      where,
      _count: { _all: true },
      orderBy: { _count: { teamId: "desc" } },
      take: 1,
    });
    return rows;
  },

  groupBookingsByTeamAndStatus: async (where, tx) => {
    const rows = await (tx ?? db).booking.groupBy({
      by: ["teamId", "status"],
      where,
      _count: { id: true },
    });
    return rows;
  },

  findBookingStartsWithStatus: (where, tx) =>
    (tx ?? db).booking.findMany({ where, select: { startTime: true, status: true } }),

  findBookingStarts: (where, tx) =>
    (tx ?? db).booking.findMany({ where, select: { startTime: true } }),

  findUserById: (id, tx) => (tx ?? db).user.findUnique({ where: { id } }),

  findTeamById: (id, tx) => (tx ?? db).team.findUnique({ where: { id } }),

  findTeamNames: (where, tx) =>
    (tx ?? db).team.findMany({ where, select: { id: true, name: true } }),

  findDistinctEventTeamIds: (where, tx) =>
    (tx ?? db).event.findMany({ where, select: { teamId: true }, distinct: ["teamId"] }),

  countUsers: (where, tx) => (tx ?? db).user.count({ where }),
  countInvites: (where, tx) => (tx ?? db).userInvite.count({ where }),
  countTeams: (where, tx) => (tx ?? db).team.count({ where }),
  countTeamMembers: (where, tx) => (tx ?? db).teamMember.count({ where }),
  countEvents: (where, tx) => (tx ?? db).event.count({ where }),
  countEventTypes: (where, tx) => (tx ?? db).eventType.count({ where }),
});
