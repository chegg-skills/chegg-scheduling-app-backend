import { prisma } from "../shared/db/prisma";

/**
 * Script to update all users with a coach-specific Zoom ISV Link.
 */
async function main() {
  console.log("--- User Zoom ISV Link Update with Coach Names ---");

  try {
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users to update.`);

    let updatedCount = 0;
    for (const user of users) {
      const slug = `${user.firstName}-${user.lastName}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const targetLink = `https://students.skills.chegg.com/meeting/test/join/7d26db62-1f37-49f5-8b49-97a66444007b/${slug}`;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          zoomIsvLink: targetLink,
        },
      });

      console.log(`Updated user ${user.firstName} ${user.lastName} -> ${targetLink}`);
      updatedCount++;
    }

    console.log(`✅ Successfully updated ${updatedCount} users.`);
  } catch (error) {
    console.error("❌ Error updating users' Zoom ISV Link:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
