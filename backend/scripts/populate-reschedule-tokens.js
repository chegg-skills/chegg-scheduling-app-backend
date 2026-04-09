const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function main() {
    const bookings = await prisma.booking.findMany({
        where: {
            rescheduleToken: null,
        },
    });

    console.log(`Found ${bookings.length} bookings without a rescheduleToken.`);

    for (const booking of bookings) {
        const token = uuidv4();
        await prisma.booking.update({
            where: { id: booking.id },
            data: { rescheduleToken: token },
        });
    }

    console.log('Successfully populated rescheduleTokens for all bookings.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
