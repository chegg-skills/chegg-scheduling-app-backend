import { UserRole } from "@prisma/client";
import { prisma } from "../shared/db/prisma";
import { createPublicBookingSlug } from "../shared/utils/publicBookingSlug";

async function backfill() {
  console.log("🚀 Starting publicBookingSlug backfill...");

  // 1. Backfill Teams
  const teams = await prisma.team.findMany({
    where: { publicBookingSlug: { equals: "" } as any }, // Adjust based on DB state
  });

  console.log(`📦 Found ${teams.length} teams to update.`);
  for (const team of teams) {
    const slug = createPublicBookingSlug(team.name, "team");
    await prisma.team.update({
      where: { id: team.id },
      data: { publicBookingSlug: slug },
    });
    console.log(`✅ Updated team: ${team.name} -> ${slug}`);
  }

  // 2. Backfill Coaches
  const coaches = await prisma.user.findMany({
    where: {
      role: UserRole.COACH,
      // @ts-ignore
      publicBookingSlug: "",
    },
  });

  console.log(`👤 Found ${coaches.length} coaches to update.`);
  for (const coach of coaches) {
    const slug = createPublicBookingSlug(`${coach.firstName} ${coach.lastName}`, "coach");
    await prisma.user.update({
      where: { id: coach.id },
      data: { publicBookingSlug: slug },
    });
    console.log(`✅ Updated coach: ${coach.firstName} ${coach.lastName} -> ${slug}`);
  }

  // 3. Backfill Events
  const events = await prisma.event.findMany({
    where: {
      // @ts-ignore
      publicBookingSlug: "",
    },
  });

  console.log(`📅 Found ${events.length} events to update.`);
  for (const event of events) {
    const slug = createPublicBookingSlug(event.name, "event");
    await prisma.event.update({
      where: { id: event.id },
      data: { publicBookingSlug: slug },
    });
    console.log(`✅ Updated event: ${event.name} -> ${slug}`);
  }

  console.log("✨ Backfill complete!");
}

backfill()
  .catch((e) => {
    console.error("❌ Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
