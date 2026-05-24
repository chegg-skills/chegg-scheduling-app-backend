import prisma from "../shared/db/prisma";

/**
 * Script to update all coach email addresses to a unique plus-address pattern:
 * e.g., itsmohit3005+coach1@gmail.com, itsmohit3005+coach2@gmail.com, etc.
 */
async function main() {
  console.log("--- Coach Email Update ---");

  try {
    const coaches = await prisma.user.findMany({
      where: {
        role: "COACH",
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    console.log(`Found ${coaches.length} coaches to update.`);

    for (let i = 0; i < coaches.length; i++) {
      const coach = coaches[i];
      const newEmail = `itsmohit3005+coach${i + 1}@gmail.com`;
      console.log(`Updating coach "${coach.firstName} ${coach.lastName}" (${coach.email}) ➡️ ${newEmail}...`);

      await prisma.user.update({
        where: { id: coach.id },
        data: { email: newEmail },
      });
    }

    console.log("✅ Successfully updated all coach emails.");
  } catch (error) {
    console.error("❌ Error updating coach emails:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
