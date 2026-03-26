import { prisma } from "../../src/shared/db/prisma";

// Disconnect the Prisma client after each test file to avoid open handle warnings.
// Prisma will lazily reconnect for the next file when running --runInBand.
afterAll(async () => {
  await prisma.$disconnect();
});
