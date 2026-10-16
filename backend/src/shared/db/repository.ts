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
