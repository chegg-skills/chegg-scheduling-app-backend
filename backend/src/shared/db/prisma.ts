import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config();

type PrismaGlobal = typeof globalThis & {
	prisma?: PrismaClient;
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

	return isWrappedInMatchingQuotes
		? trimmedValue.slice(1, -1)
		: trimmedValue;
};

const createPrismaClient = (): PrismaClient => {
	return new PrismaClient({
		adapter: new PrismaPg({ connectionString: getDatabaseUrl() }),
	});
};

const globalForPrisma = globalThis as PrismaGlobal;

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
	globalForPrisma.prisma = prisma;
}

export default prisma;