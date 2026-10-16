import type { Prisma, Team, UserRole } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import { runInTransaction, type DbClient } from "../../shared/db/repository";

const teamLeadInclude = {
  teamLead: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.TeamInclude;

export type TeamWithLead = Prisma.TeamGetPayload<{ include: typeof teamLeadInclude }>;

export interface TeamRepository {
  findUserRoleAndStatus(
    userId: string,
    tx?: DbClient,
  ): Promise<{ role: UserRole; isActive: boolean } | null>;
  create(data: Prisma.TeamUncheckedCreateInput, tx?: DbClient): Promise<Team>;
  upsertLeadMembership(teamId: string, userId: string, tx?: DbClient): Promise<void>;
  findManyWithCount(
    params: { where: Prisma.TeamWhereInput; skip: number; take: number },
    tx?: DbClient,
  ): Promise<[TeamWithLead[], number]>;
  /** Live (not soft-deleted) team with its lead. */
  findActiveWithLead(id: string, tx?: DbClient): Promise<TeamWithLead | null>;
  /** Live (not soft-deleted) team. */
  findActive(id: string, tx?: DbClient): Promise<Team | null>;
  update(id: string, data: Prisma.TeamUpdateInput, tx?: DbClient): Promise<Team>;
  /**
   * Soft-deletes the team and cleans up its children as one atomic unit. Bookings are
   * intentionally preserved. The order matters because of FK constraints (see inline notes).
   */
  softDeleteWithChildren(teamId: string, tx?: DbClient): Promise<void>;
}

export const createTeamRepo = (db: DbClient = prisma): TeamRepository => ({
  findUserRoleAndStatus: (userId, tx) =>
    (tx ?? db).user.findUnique({
      where: { id: userId },
      select: { role: true, isActive: true },
    }),

  create: (data, tx) => (tx ?? db).team.create({ data }),

  upsertLeadMembership: async (teamId, userId, tx) => {
    await (tx ?? db).teamMember.upsert({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
      create: {
        teamId,
        userId,
        isActive: true,
      },
      update: {
        isActive: true,
      },
    });
  },

  findManyWithCount: ({ where, skip, take }, tx) => {
    const client = tx ?? db;
    const queries = [
      client.team.findMany({
        where,
        include: teamLeadInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      client.team.count({ where }),
    ] as const;
    // Root client: one batched transaction (as before). A transaction client is already atomic.
    return "$transaction" in client ? client.$transaction([...queries]) : Promise.all(queries);
  },

  findActiveWithLead: (id, tx) =>
    (tx ?? db).team.findFirst({
      where: { id, deletedAt: null },
      include: teamLeadInclude,
    }),

  findActive: (id, tx) => (tx ?? db).team.findFirst({ where: { id, deletedAt: null } }),

  update: (id, data, tx) => (tx ?? db).team.update({ where: { id }, data }),

  softDeleteWithChildren: (teamId, tx) =>
    runInTransaction(tx ?? db, async (t) => {
      // Gather all event IDs for bulk child cleanup
      const eventIds = (await t.event.findMany({ where: { teamId }, select: { id: true } })).map(
        (e) => e.id,
      );

      if (eventIds.length > 0) {
        await t.eventCoach.deleteMany({ where: { eventId: { in: eventIds } } });
        await t.eventScheduleSlot.deleteMany({ where: { eventId: { in: eventIds } } });
        await t.recurrenceGroup.deleteMany({ where: { eventId: { in: eventIds } } });
        await t.eventRoutingState.deleteMany({ where: { eventId: { in: eventIds } } });
        // Null out groupId before deleting EventGroups (Event→EventGroup FK is Restrict)
        await t.event.updateMany({
          where: { teamId },
          data: { deletedAt: new Date(), isActive: false, groupId: null },
        });
      }

      // Hard-delete EventGroups now that no events reference them
      await t.eventGroup.deleteMany({ where: { teamId } });

      // Clean up team-level children
      await t.teamMember.deleteMany({ where: { teamId } });
      await t.teamNotificationConfig.deleteMany({ where: { teamId } });

      // Soft-delete the team — bookings are intentionally preserved
      await t.team.update({
        where: { id: teamId },
        data: { deletedAt: new Date(), isActive: false },
      });
    }),
});
