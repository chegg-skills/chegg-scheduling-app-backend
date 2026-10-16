import type { Prisma, PrismaClient } from "@prisma/client";

/** Either the root client or an interactive-transaction client; repositories accept both. */
export type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Minimal shared repository contract. Only `findById` is required — domains add the
 * methods they actually need rather than implementing a full CRUD surface.
 */
export interface BaseRepository<T> {
  findById(id: string, tx?: DbClient): Promise<T | null>;
}

/**
 * Runs a batch of Prisma operations atomically. The root client wraps them in one
 * `$transaction`; an interactive transaction client is already atomic, so the
 * operations are simply awaited together.
 */
export const runBatch = async (
  client: DbClient,
  operations: Prisma.PrismaPromise<unknown>[],
): Promise<void> => {
  if ("$transaction" in client) {
    await client.$transaction(operations);
  } else {
    await Promise.all(operations);
  }
};
