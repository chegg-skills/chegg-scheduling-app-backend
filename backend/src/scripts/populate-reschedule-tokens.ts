import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../shared/db/prisma';

async function main() {
    console.log('Fetching bookings without rescheduleToken...');

    const bookings = await prisma.booking.findMany({
        where: {
            rescheduleToken: null,
        },
    });

    console.log(`Found ${bookings.length} bookings without a rescheduleToken.`);

    if (bookings.length === 0) {
        console.log('Nothing to update.');
        return;
    }

    let updatedCount = 0;
    for (const booking of bookings) {
        try {
            await prisma.booking.update({
                where: { id: booking.id },
                data: { rescheduleToken: uuidv4() },
            });
            updatedCount++;
            if (updatedCount % 10 === 0) {
                console.log(`Updated ${updatedCount}/${bookings.length} bookings...`);
            }
        } catch (error) {
            console.error(`Failed to update booking ${booking.id}:`, error);
        }
    }

    console.log(`Successfully populated rescheduleTokens for ${updatedCount} bookings.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
