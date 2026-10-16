import type { Prisma, TeamMember, TeamNotificationConfig } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import type { DbClient } from "../../shared/db/repository";

export type NotificationConfigInput = Omit<
  Prisma.TeamNotificationConfigUncheckedCreateInput,
  "teamId" | "id"
>;

export interface TeamNotificationConfigRepository {
  findMembership(teamId: string, userId: string, tx?: DbClient): Promise<TeamMember | null>;
  findConfig(teamId: string, tx?: DbClient): Promise<TeamNotificationConfig | null>;
  upsertConfig(
    teamId: string,
    data: NotificationConfigInput,
    tx?: DbClient,
  ): Promise<TeamNotificationConfig>;
}

export const createTeamNotificationConfigRepo = (
  db: DbClient = prisma,
): TeamNotificationConfigRepository => ({
  findMembership: (teamId, userId, tx) =>
    (tx ?? db).teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    }),

  findConfig: (teamId, tx) => (tx ?? db).teamNotificationConfig.findUnique({ where: { teamId } }),

  upsertConfig: (teamId, data, tx) =>
    (tx ?? db).teamNotificationConfig.upsert({
      where: { teamId },
      update: data,
      create: {
        ...data,
        teamId,
      },
    }),
});
