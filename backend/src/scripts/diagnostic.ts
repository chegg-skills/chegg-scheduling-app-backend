import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Checking user account status...");
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            role: true,
            failedLoginAttempts: true,
            lockedUntil: true,
            isActive: true,
        }
    });

    console.log("User accounts found:");
    console.log(JSON.stringify(users, null, 2));

    const lockedUsers = users.filter(u => (u.lockedUntil && new Date(u.lockedUntil) > new Date()) || u.failedLoginAttempts > 0);

    if (lockedUsers.length > 0) {
        console.log("⚠️ Found locked or failed attempt accounts. Resetting...");
        for (const user of lockedUsers) {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    failedLoginAttempts: 0,
                    lockedUntil: null,
                    isActive: true,
                }
            });
            console.log(`✅ Reset account: ${user.email}`);
        }
    } else {
        console.log("✨ No locked accounts found.");
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
