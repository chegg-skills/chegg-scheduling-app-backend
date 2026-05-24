import prisma from "../shared/db/prisma";

async function main() {
  console.log("🔍 Inspecting bookings for Event...");
  const eventId = "b28f8f46-28b1-4d04-8f00-a7ac464c4944";

  try {
    const bookings = await prisma.booking.findMany({
      where: { eventId },
    });

    console.log(`Found ${bookings.length} total bookings for this event.`);
    console.log("-----------------------------------------");
    bookings.forEach((b) => {
      console.log(` - ID: ${b.id}`);
      console.log(`   Student: ${b.studentName} (${b.studentEmail})`);
      console.log(`   Status: "${b.status}"`);
      console.log(`   Time: ${b.startTime.toISOString()} to ${b.endTime.toISOString()}`);
      console.log("-----------------------------------------");
    });
  } catch (error) {
    console.error("Error inspecting bookings:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
