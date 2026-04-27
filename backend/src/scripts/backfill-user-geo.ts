import prisma from "../shared/db/prisma";

/**
 * Script to update all users to India geography.
 * Sets country to "India" and timezone to "Asia/Kolkata".
 */
async function main() {
  console.log('--- User Geography Update ---');
  console.log('Updating all users to Country: India, Timezone: Asia/Kolkata...');

  try {
    const result = await prisma.user.updateMany({
      data: {
        country: 'India',
        timezone: 'Asia/Kolkata',
      },
    });

    console.log(`✅ Successfully updated ${result.count} users.`);
  } catch (error) {
    console.error('❌ Error updating users:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
