import type { Prisma, User } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import type { DbClient } from "../../shared/db/repository";

export interface AuthRepository {
  findUserByEmail(email: string, tx?: DbClient): Promise<User | null>;
  findUserById(id: string, tx?: DbClient): Promise<User | null>;
  countUsers(tx?: DbClient): Promise<number>;
  createUser(data: Prisma.UserUncheckedCreateInput, tx?: DbClient): Promise<User>;
  /** Records a failed password attempt; `lockedUntil` is set when the account is being locked. */
  recordFailedLogin(
    id: string,
    state: { failedLoginAttempts: number; lockedUntil: Date | null },
    tx?: DbClient,
  ): Promise<void>;
  /** Clears the failed-attempt counter and any lock, and stamps the login time. */
  recordSuccessfulLogin(id: string, loggedInAt: Date, tx?: DbClient): Promise<User>;
}

export const createAuthRepo = (db: DbClient = prisma): AuthRepository => ({
  findUserByEmail: (email, tx) => (tx ?? db).user.findUnique({ where: { email } }),

  findUserById: (id, tx) => (tx ?? db).user.findUnique({ where: { id } }),

  countUsers: (tx) => (tx ?? db).user.count(),

  createUser: (data, tx) => (tx ?? db).user.create({ data }),

  recordFailedLogin: async (id, { failedLoginAttempts, lockedUntil }, tx) => {
    await (tx ?? db).user.update({
      where: { id },
      data: {
        failedLoginAttempts,
        lockedUntil,
      },
    });
  },

  recordSuccessfulLogin: (id, loggedInAt, tx) =>
    (tx ?? db).user.update({
      where: { id },
      data: {
        lastLoginAt: loggedInAt,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
});
