import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { logger } from "../logging/logger";

dotenv.config();

type PrismaGlobal = typeof globalThis & {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

const getDatabaseUrl = (): string => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const trimmedValue = databaseUrl.trim();
  const isWrappedInMatchingQuotes =
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"));

  return isWrappedInMatchingQuotes ? trimmedValue.slice(1, -1) : trimmedValue;
};

const createPgPool = (): Pool => {
  const dbUrl = getDatabaseUrl();
  const isProduction = process.env.NODE_ENV === "production" || !dbUrl.includes("localhost");

  const pool = new Pool({
    connectionString: dbUrl,
    allowExitOnIdle: process.env.NODE_ENV !== "production",
    ssl: isProduction ? { rejectUnauthorized: true } : false,
  });

  // Without this handler, an error on an idle pool client becomes an unhandled
  // EventEmitter error that crashes the process. Log it and let the pool recover.
  pool.on("error", (err) => {
    logger.error({ error: err }, "Idle pg pool client encountered an error.");
  });

  pool.on("connect", () => {
    logger.debug("New pg pool client connected.");
  });

  pool.on("remove", () => {
    logger.debug("Pg pool client removed.");
  });

  return pool;
};

const createPrismaClient = (pool: Pool): PrismaClient => {
  const client = new PrismaClient({
    adapter: new PrismaPg(pool),
    log: [
      { emit: "event", level: "warn" },
      { emit: "event", level: "error" },
    ],
  });

  // Route Prisma's internal warn/error events through our logger so they appear
  // in the same structured stream as application logs.
  client.$on("warn", (e) => {
    logger.warn({ message: e.message }, "Prisma warning.");
  });

  client.$on("error", (e) => {
    logger.error({ message: e.message }, "Prisma error.");
  });

  return client;
};

const globalForPrisma = globalThis as PrismaGlobal;
const pgPool = globalForPrisma.pgPool ?? createPgPool();

export const prisma = globalForPrisma.prisma ?? createPrismaClient(pgPool);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pgPool;
}

export default prisma;
