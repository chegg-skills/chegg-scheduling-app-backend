import { prisma } from "../shared/db/prisma";
import { createBooking } from "../domain/bookings/booking.service";

async function runManyToOneStressTestV2() {
    const eventId = "0321b054-1f9e-4589-8244-dcd87d67f711";
    const teamId = "d077f525-d9db-48a7-a9e3-c4caf59e5d5f";

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
        console.error("Event not found.");
        return;
    }

    const slots = await prisma.eventScheduleSlot.findMany({
        where: { eventId, isActive: true },
        orderBy: { startTime: "asc" }
    });

    if (slots.length < 20) {
        console.error(`Not enough slots (found ${slots.length}). Need 20.`);
        return;
    }

    console.log(`Starting 20-booking Many-To-One stress test (Run #2 - ROUND ROBIN) for event ${eventId}...`);

    const results = [];

    for (let i = 0; i < 20; i++) {
        const slot = slots[i];
        const studentName = `Panel Student V2-${i + 1}`;
        const studentEmail = `panel.student.v2.${i + 1}@example.com`;
        const startTime = slot.startTime.toISOString();

        process.stdout.write(`Booking ${i + 1}/20 at ${startTime}... `);

        try {
            const booking = await createBooking({
                teamId,
                eventId,
                studentName,
                studentEmail,
                startTime,
            });

            const b = await prisma.booking.findUnique({
                where: { id: booking.id },
                include: { coach: true }
            });

            // Resolve co-hosts from IDs
            const coHosts = await prisma.user.findMany({
                where: { id: { in: b?.coCoachUserIds || [] } }
            });

            const leadName = b?.coach ? `${b.coach.firstName} ${b.coach.lastName}` : "Unknown";
            const coHostNames = coHosts.map(u => `${u.firstName} ${u.lastName}`);

            results.push({
                bookingNumber: i + 1,
                student: studentName,
                lead: leadName,
                coHosts: coHostNames,
                status: "SUCCESS"
            });

            console.log(`Done. Lead: ${leadName}, Co-hosts: [${coHostNames.join(", ")}]`);
        } catch (error: any) {
            console.log(`FAILED: ${error.message}`);
            results.push({
                bookingNumber: i + 1,
                student: studentName,
                status: "FAILED",
                error: error.message
            });
        }
    }

    console.log("\n--- MANY-TO-ONE STRESS TEST V2 COMPLETE ---");
    console.log(JSON.stringify(results, null, 2));
}

runManyToOneStressTestV2()
    .catch(err => console.error(err))
    .finally(() => prisma.$disconnect());
