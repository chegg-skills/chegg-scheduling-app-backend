import prisma from "../shared/db/prisma";

/**
 * Script to update all admin (SUPER_ADMIN and TEAM_ADMIN) email addresses to:
 * e.g., itsmohit3005+admin1@gmail.com, itsmohit3005+admin2@gmail.com, etc.
 */
async function main() {
  console.log("--- Admin Email Update ---");

  try {
    const admins = await prisma.user.findMany({
      where: {
        role: "TEAM_ADMIN",
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    console.log(`Found ${admins.length} admins to update.`);

    for (let i = 0; i < admins.length; i++) {
      const admin = admins[i];
      const newEmail = `itsmohit3005+admin${i + 1}@gmail.com`;
      console.log(`Updating admin "${admin.firstName} ${admin.lastName}" (${admin.email}, Role: ${admin.role}) ➡️ ${newEmail}...`);

      await prisma.user.update({
        where: { id: admin.id },
        data: { email: newEmail },
      });
    }

    console.log("✅ Successfully updated all admin emails.");
  } catch (error) {
    console.error("❌ Error updating admin emails:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
