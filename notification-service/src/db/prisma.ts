import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

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
  const isProduction =
    process.env.NODE_ENV === "production" || !dbUrl.includes("localhost");

  return new Pool({
    connectionString: dbUrl,
    allowExitOnIdle: process.env.NODE_ENV !== "production",
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  });
};

const globalForPrisma = globalThis as PrismaGlobal;
const pgPool = globalForPrisma.pgPool ?? createPgPool();

const createPrismaClient = (): PrismaClient => {
  return new PrismaClient({
    adapter: new PrismaPg(pgPool),
  });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pgPool;
}

export default prisma;
