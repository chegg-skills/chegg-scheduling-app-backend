import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import type { DbClient } from "../../shared/db/repository";
import { eventGroupInclude, type SafeEventGroup } from "./eventGroup.shared";

export interface EventGroupRepository {
  findById(id: string, tx?: DbClient): Promise<SafeEventGroup | null>;
  findManyByTeam(teamId: string, tx?: DbClient): Promise<SafeEventGroup[]>;
  create(data: Prisma.EventGroupUncheckedCreateInput, tx?: DbClient): Promise<SafeEventGroup>;
  update(
    id: string,
    data: Prisma.EventGroupUncheckedUpdateInput,
    tx?: DbClient,
  ): Promise<SafeEventGroup>;
  delete(id: string, tx?: DbClient): Promise<void>;
}

export const createEventGroupRepo = (db: DbClient = prisma): EventGroupRepository => ({
  findById: (id, tx) =>
    (tx ?? db).eventGroup.findUnique({ where: { id }, include: eventGroupInclude }),

  findManyByTeam: (teamId, tx) =>
    (tx ?? db).eventGroup.findMany({
      where: { teamId },
      orderBy: { name: "asc" },
      include: eventGroupInclude,
    }),

  create: (data, tx) => (tx ?? db).eventGroup.create({ data, include: eventGroupInclude }),

  update: (id, data, tx) =>
    (tx ?? db).eventGroup.update({ where: { id }, data, include: eventGroupInclude }),

  delete: async (id, tx) => {
    await (tx ?? db).eventGroup.delete({ where: { id } });
  },
});
