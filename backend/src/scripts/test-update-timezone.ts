import { prisma } from "../shared/db/prisma";
import { updateEvent } from "../domain/events/event.service";

async function main() {
  console.log("🔍 Checking first event in database...");
  const event = await prisma.event.findFirst({
    include: {
      team: true,
      coaches: {
        include: { coachUser: true }
      }
    }
  });

  if (!event) {
    console.log("❌ No events found in DB!");
    return;
  }

  console.log(`Found event: ${event.name} (ID: ${event.id}), Current Timezone: ${event.timezone}`);

  console.log("Attempting to update timezone to 'America/New_York' via event service...");
  // Mock caller (SUPER_ADMIN)
  const caller = {
    id: event.createdById,
    role: "SUPER_ADMIN" as any,
    firstName: "Test",
    lastName: "Admin",
    email: "test@admin.com",
    timezone: "UTC"
  };

  try {
    const updated = await updateEvent(
      event.id,
      { timezone: "America/New_York" },
      caller
    );
    console.log(`✅ Update call succeeded! Saved Timezone in returned object: ${updated.timezone}`);

    // Fetch again from DB directly to verify persistence
    const reFetched = await prisma.event.findUnique({
      where: { id: event.id }
    });
    console.log(`🔍 Direct DB check. Timezone is: ${reFetched?.timezone}`);

    // Restore old timezone
    await prisma.event.update({
      where: { id: event.id },
      data: { timezone: event.timezone }
    });
    console.log("Old timezone restored.");

  } catch (err) {
    console.error("❌ Update failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
