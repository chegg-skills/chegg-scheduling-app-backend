import prisma from "../shared/db/prisma";

async function main() {
  console.log("🔍 Inspecting Event in Database...");
  const eventId = "b28f8f46-28b1-4d04-8f00-a7ac464c4944";

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        coaches: {
          include: {
            coachUser: true,
          },
        },
      },
    });

    if (!event) {
      console.log(`❌ Event ${eventId} not found!`);
      return;
    }

    console.log("-----------------------------------------");
    console.log("Event Properties:");
    console.log(`ID: ${event.id}`);
    console.log(`Name: ${event.name}`);
    console.log(`Interaction Type: ${event.interactionType}`);
    console.log(`Min Coach Count: ${event.minCoachCount}`);
    console.log(`Max Coach Count: ${event.maxCoachCount}`);
    console.log(`Coaches Assigned Count: ${event.coaches.length}`);
    console.log("Coaches Assigned Details:");
    event.coaches.forEach((c) => {
      console.log(` - ID: ${c.coachUserId}, Name: ${c.coachUser.firstName} ${c.coachUser.lastName}`);
    });
    console.log("-----------------------------------------");
  } catch (error) {
    console.error("Error inspecting event:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
