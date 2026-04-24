import { prisma } from "../../src/shared/db/prisma";

/**
 * Wipe all application data in FK-safe order.
 * Called in beforeAll / afterAll to isolate test suites from each other.
 */
export const clearTables = async (): Promise<void> => {
  await prisma.booking.deleteMany();
  await prisma.student.deleteMany();
  await prisma.eventRoutingState.deleteMany();
  await prisma.sessionLog.deleteMany();   // explicit; cascades from slot cover attendance but this is safer
  await prisma.eventScheduleSlot.deleteMany();
  await prisma.eventCoach.deleteMany();
  await prisma.event.deleteMany();
  await prisma.eventOffering.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.oidcState.deleteMany();    // no FK; was not cleaned before
  await prisma.userInvite.deleteMany();
  await prisma.user.deleteMany();
};
