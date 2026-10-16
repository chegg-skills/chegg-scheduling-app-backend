import { Prisma, UserRole, type User } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import type { BaseRepository, DbClient } from "../../shared/db/repository";

const userDetailInclude = {
  teamMemberships: { include: { team: true } },
  coachedEvents: {
    include: {
      event: {
        include: {
          eventType: true,
          team: true,
        },
      },
    },
  },
  weeklyAvailability: true,
  availabilityExceptions: true,
} satisfies Prisma.UserInclude;

export type UserWithDetails = Prisma.UserGetPayload<{ include: typeof userDetailInclude }>;
export type UserRoleStatus = { role: UserRole; isActive: boolean };
export type UserSlugSource = Pick<User, "role" | "publicBookingSlug" | "firstName" | "lastName">;

export interface UserRepository extends BaseRepository<User> {
  findByIdWithDetails(id: string, tx?: DbClient): Promise<UserWithDetails | null>;
  findRoleById(id: string, tx?: DbClient): Promise<{ role: UserRole } | null>;
  findRoleAndStatusById(id: string, tx?: DbClient): Promise<UserRoleStatus | null>;
  findSlugSourceById(id: string, tx?: DbClient): Promise<UserSlugSource | null>;
  countOtherActiveSuperAdmins(excludeUserId: string, tx?: DbClient): Promise<number>;
  findManyWithCount(
    params: { where: Prisma.UserWhereInput; skip: number; take: number },
    tx?: DbClient,
  ): Promise<[User[], number]>;
  update(id: string, data: Prisma.UserUpdateInput, tx?: DbClient): Promise<User>;
}

export const createUserRepo = (db: DbClient = prisma): UserRepository => ({
  findById: (id, tx) => (tx ?? db).user.findUnique({ where: { id } }),

  findByIdWithDetails: (id, tx) =>
    (tx ?? db).user.findUnique({ where: { id }, include: userDetailInclude }),

  findRoleById: (id, tx) => (tx ?? db).user.findUnique({ where: { id }, select: { role: true } }),

  findRoleAndStatusById: (id, tx) =>
    (tx ?? db).user.findUnique({ where: { id }, select: { role: true, isActive: true } }),

  findSlugSourceById: (id, tx) =>
    (tx ?? db).user.findUnique({
      where: { id },
      select: { role: true, publicBookingSlug: true, firstName: true, lastName: true },
    }),

  countOtherActiveSuperAdmins: (excludeUserId, tx) =>
    (tx ?? db).user.count({
      where: { role: UserRole.SUPER_ADMIN, isActive: true, id: { not: excludeUserId } },
    }),

  findManyWithCount: ({ where, skip, take }, tx) => {
    const client = tx ?? db;
    const queries = [
      client.user.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
      client.user.count({ where }),
    ] as const;
    // The root client batches both reads in one transaction (as before); an
    // interactive transaction client is already atomic, so just await the pair.
    return "$transaction" in client ? client.$transaction([...queries]) : Promise.all(queries);
  },

  update: (id, data, tx) => (tx ?? db).user.update({ where: { id }, data }),
});
