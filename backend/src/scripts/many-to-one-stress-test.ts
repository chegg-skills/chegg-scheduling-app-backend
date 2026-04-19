import { prisma } from "../shared/db/prisma";
import { createBooking } from "../domain/bookings/booking.service";

async function runManyToOneStressTest() {
    const eventId = "0321b054-1f9e-4589-8244-dcd87d67f711";
    const teamId = "d077f525-d9db-48a7-a9e3-c4caf59e5d5f";

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
        console.error("Event not found.");
        return;
    }

    // Cleanup: Delete bookings one more time to be sure
    await prisma.booking.deleteMany({ where: { eventId } });

    console.log(`Starting 20-booking Many-To-One stress test (Run #2) for event ${eventId}...`);

    const results = [];
    const baseStart = new Date("2026-05-15T09:00:00Z");

    for (let i = 0; i < 20; i++) {
        const studentName = `Panel Student ${i + 1}`;
        const studentEmail = `panel.student.${i + 1}@example.com`;
        const start = new Date(baseStart.getTime() + i * 4500000); // 1h15m gap
        const startTime = start.toISOString();

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

    console.log("\n--- MANY-TO-ONE STRESS TEST COMPLETE ---");
    console.log(JSON.stringify(results, null, 2));
}

runManyToOneStressTest()
    .catch(err => console.error(err))
    .finally(() => prisma.$disconnect());
