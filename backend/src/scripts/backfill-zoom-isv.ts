import prisma from "../shared/db/prisma";

/**
 * Script to update all users with a specific Zoom ISV Link.
 */
async function main() {
  console.log("--- User Zoom ISV Link Update ---");
  const targetLink = "https://students.skills.chegg.com/meeting/join/7d26db62-1f37-49f5-8b49-97a66444007b";
  console.log(`Updating all users to zoomIsvLink: ${targetLink}...`);

  try {
    const result = await prisma.user.updateMany({
      data: {
        zoomIsvLink: targetLink,
      },
    });

    console.log(`✅ Successfully updated ${result.count} users.`);
  } catch (error) {
    console.error("❌ Error updating users' Zoom ISV Link:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
