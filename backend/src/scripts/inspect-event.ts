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

    console.log(JSON.stringify(event, null, 2));
    console.log("-----------------------------------------");
  } catch (error) {
    console.error("Error inspecting event:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
