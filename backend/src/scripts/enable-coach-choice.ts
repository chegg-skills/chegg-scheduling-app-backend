import { prisma } from "../shared/db/prisma";

async function main() {
  console.log("🔍 Finding events in the database...");
  try {
    const events = await prisma.event.findMany({
      include: {
        team: true,
        coaches: {
          include: {
            coachUser: true,
          },
        },
      },
    });

    if (events.length === 0) {
      console.log("❌ No events found in the database. Make sure you seeded it first!");
      return;
    }

    // Let's print the available events
    console.log(`Found ${events.length} events:`);
    for (const e of events) {
      console.log(`- ID: ${e.id}, Name: "${e.name}", Slug: "${e.publicBookingSlug}", Team: "${e.team.name}", Coaches count: ${e.coaches.length}, allowStudentCoachChoice: ${e.allowStudentCoachChoice}`);
    }

    // Let's choose the first event, e.g. "System Design Review" or any event, and update it
    const targetEvent = events.find(e => e.name.includes("System Design")) || events[0];
    console.log(`\n🎯 Selected event to modify: "${targetEvent.name}" (ID: ${targetEvent.id})`);

    // Ensure it has at least 2 coaches. If not, let's find other users in the team and assign them
    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId: targetEvent.teamId },
      include: { user: true },
    });

    console.log(`Coaches available in the team "${targetEvent.team.name}": ${teamMembers.length}`);

    // Assign up to 3 coaches
    const coachesToAssign = teamMembers.slice(0, 3);
    
    // Clear existing event coaches
    await prisma.eventCoach.deleteMany({
      where: { eventId: targetEvent.id }
    });

    // Create new event coaches
    for (let i = 0; i < coachesToAssign.length; i++) {
      await prisma.eventCoach.create({
        data: {
          eventId: targetEvent.id,
          coachUserId: coachesToAssign[i].userId,
          coachOrder: i + 1,
          isActive: true
        }
      });
    }

    // Update the event to allow coach choice
    const updatedEvent = await prisma.event.update({
      where: { id: targetEvent.id },
      data: {
        allowStudentCoachChoice: true,
      },
    });

    console.log(`\n✅ Event "${updatedEvent.name}" successfully updated!`);
    console.log(`- allowStudentCoachChoice: ${updatedEvent.allowStudentCoachChoice}`);
    console.log(`- Assigned coaches: ${coachesToAssign.map(c => `${c.user.firstName} ${c.user.lastName}`).join(", ")}`);
    console.log(`\n🌐 Observe the issue by opening this URL in your browser:`);
    console.log(`   http://localhost:3000/book/event/${updatedEvent.publicBookingSlug || updatedEvent.id}`);
    console.log(`\n💡 To see the "Step-shift race", throttle your browser network speed to "Slow 3G" in DevTools, and reload the page.`);

  } catch (error) {
    console.error("Error updating event:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
