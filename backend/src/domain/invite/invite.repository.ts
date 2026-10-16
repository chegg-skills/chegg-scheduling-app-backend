import type { Prisma, User, UserInvite } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import type { DbClient } from "../../shared/db/repository";

const inviteWithCreatorInclude = {
  createdByUser: { select: { firstName: true, lastName: true, email: true } },
} satisfies Prisma.UserInviteInclude;

export type InviteWithCreatorRow = Prisma.UserInviteGetPayload<{
  include: typeof inviteWithCreatorInclude;
}>;

export interface InviteRepository {
  findUserByEmail(email: string, tx?: DbClient): Promise<User | null>;
  findPendingInviteByEmail(email: string, now: Date, tx?: DbClient): Promise<UserInvite | null>;
  create(data: Prisma.UserInviteUncheckedCreateInput, tx?: DbClient): Promise<UserInvite>;
  findByToken(token: string, tx?: DbClient): Promise<UserInvite | null>;
  findByIdWithCreator(id: string, tx?: DbClient): Promise<InviteWithCreatorRow | null>;
  findManyWithCount(
    params: { where: Prisma.UserInviteWhereInput; skip: number; take: number },
    tx?: DbClient,
  ): Promise<[InviteWithCreatorRow[], number]>;
  markRevoked(id: string, revokedAt: Date, tx?: DbClient): Promise<InviteWithCreatorRow>;
  /** Creates the user and marks the invite accepted as one atomic unit; returns the new user. */
  createUserAndAcceptInvite(
    userData: Prisma.UserUncheckedCreateInput,
    inviteId: string,
    acceptedAt: Date,
    tx?: DbClient,
  ): Promise<User>;
}

export const createInviteRepo = (db: DbClient = prisma): InviteRepository => ({
  findUserByEmail: (email, tx) => (tx ?? db).user.findUnique({ where: { email } }),

  findPendingInviteByEmail: (email, now, tx) =>
    (tx ?? db).userInvite.findFirst({
      where: { email, acceptedAt: null, expiresAt: { gt: now } },
    }),

  create: (data, tx) => (tx ?? db).userInvite.create({ data }),

  findByToken: (token, tx) => (tx ?? db).userInvite.findUnique({ where: { token } }),

  findByIdWithCreator: (id, tx) =>
    (tx ?? db).userInvite.findUnique({ where: { id }, include: inviteWithCreatorInclude }),

  findManyWithCount: ({ where, skip, take }, tx) => {
    const client = tx ?? db;
    const queries = [
      client.userInvite.findMany({
        where,
        include: inviteWithCreatorInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      client.userInvite.count({ where }),
    ] as const;
    // Root client: one batched transaction (as before). A transaction client is already atomic.
    return "$transaction" in client ? client.$transaction([...queries]) : Promise.all(queries);
  },

  markRevoked: (id, revokedAt, tx) =>
    (tx ?? db).userInvite.update({
      where: { id },
      data: { revokedAt },
      include: inviteWithCreatorInclude,
    }),

  createUserAndAcceptInvite: async (userData, inviteId, acceptedAt, tx) => {
    const client = tx ?? db;
    const operations = [
      client.user.create({ data: userData }),
      client.userInvite.update({ where: { id: inviteId }, data: { acceptedAt } }),
    ] as const;
    const [createdUser] =
      "$transaction" in client
        ? await client.$transaction([...operations])
        : await Promise.all(operations);
    return createdUser;
  },
});
