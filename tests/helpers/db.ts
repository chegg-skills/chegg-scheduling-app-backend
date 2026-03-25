import { prisma } from "../../src/shared/db/prisma";

/**
 * Wipe all application data in FK-safe order.
 * Called in beforeAll / afterAll to isolate test suites from each other.
 */
export const clearTables = async (): Promise<void> => {
  await prisma.eventRoutingState.deleteMany();
  await prisma.eventHost.deleteMany();
  await prisma.event.deleteMany();
  await prisma.eventInteractionType.deleteMany();
  await prisma.eventOffering.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.userInvite.deleteMany();
  await prisma.user.deleteMany();
};
