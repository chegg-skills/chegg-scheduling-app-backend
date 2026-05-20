import { prisma } from "../shared/db/prisma";
import { UserRole } from "@prisma/client";

async function main() {
  console.log("🛠️ Starting coach weekly availability seeding (9:00 AM - 5:00 PM IST)...");

  // 1. Fetch all coaches from the database
  const coaches = await prisma.user.findMany({
    where: { role: UserRole.COACH },
    select: { id: true, email: true, firstName: true, lastName: true, timezone: true },
  });

  if (coaches.length === 0) {
    console.log("⚠️ No coaches found in the database.");
    return;
  }

  console.log(`✅ Found ${coaches.length} coaches in the database.`);

  const weekdays = [1, 2, 3, 4, 5]; // Monday (1) through Friday (5)

  for (const coach of coaches) {
    console.log(`⏳ Seeding schedule for ${coach.firstName} ${coach.lastName} (${coach.email})...`);

    // Ensure their timezone is explicitly set to Asia/Kolkata (IST) to align calculations
    await prisma.user.update({
      where: { id: coach.id },
      data: { timezone: "Asia/Kolkata" },
    });

    // Clean up existing weekly availability to start fresh
    await prisma.userWeeklyAvailability.deleteMany({
      where: { userId: coach.id },
    });

    // Seed 9:00 AM to 5:00 PM (09:00 to 17:00) local time (IST) for each weekday
    await prisma.userWeeklyAvailability.createMany({
      data: weekdays.map((dayOfWeek) => ({
        userId: coach.id,
        dayOfWeek,
        startTime: "09:00",
        endTime: "17:00",
      })),
    });
  }

  console.log("🎉 Seeding of coach weekly recurring availabilities completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Availability seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
