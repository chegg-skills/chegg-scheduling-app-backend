import { prisma } from "../../shared/db/prisma";

async function main() {
  console.log("🧹 Deleting all bookings and booking-related data...");

  // Delete session attendance records
  const deletedAttendance = await prisma.sessionAttendance.deleteMany();
  console.log(`- Deleted ${deletedAttendance.count} session attendance records.`);

  // Delete session logs
  const deletedLogs = await prisma.sessionLog.deleteMany();
  console.log(`- Deleted ${deletedLogs.count} session log records.`);

  // Delete booking activities
  const deletedActivities = await prisma.bookingActivity.deleteMany();
  console.log(`- Deleted ${deletedActivities.count} booking activity records.`);

  // Delete bookings
  const deletedBookings = await prisma.booking.deleteMany();
  console.log(`- Deleted ${deletedBookings.count} booking records.`);

  // Delete student communications
  const deletedComms = await prisma.studentCommunicationLog.deleteMany();
  console.log(`- Deleted ${deletedComms.count} student communication logs.`);

  // Delete students
  const deletedStudents = await prisma.student.deleteMany();
  console.log(`- Deleted ${deletedStudents.count} student records.`);

  // Delete transactional notification logs
  const deletedOutbox = await prisma.outboxNotification.deleteMany();
  console.log(`- Deleted ${deletedOutbox.count} outbox notification records.`);

  const deletedDelivery = await prisma.notificationDelivery.deleteMany();
  console.log(`- Deleted ${deletedDelivery.count} notification delivery records.`);

  console.log("✅ Database booking cleanup completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error deleting bookings:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
