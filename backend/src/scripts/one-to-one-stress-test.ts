import { prisma } from "../shared/db/prisma";
import { createBooking } from "../domain/bookings/booking.service";

async function runStressTest() {
    const eventId = "9fe55913-ba1c-4c1e-972f-d92131028307";
    const teamId = "d077f525-d9db-48a7-a9e3-c4caf59e5d5f";

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
        console.error("Event not found.");
        return;
    }

    console.log(`Starting 20-booking stress test for event ${eventId} (Mode: ${event.bookingMode}, Logic: Round-Robin, Buffer: 15m)...`);

    const results = [];
    const baseStart = new Date("2026-04-21T09:00:00Z"); // Start Tue morning

    for (let i = 0; i < 20; i++) {
        // Spacer: 1 hour + 15 minutes = 75 minutes
        const start = new Date(baseStart.getTime() + i * 4500000);
        const startTime = start.toISOString();

        process.stdout.write(`Booking ${i + 1}/20 at ${startTime}... `);

        try {
            const booking = await createBooking({
                teamId,
                eventId,
                studentName: `Stress Test Student ${i + 1}`,
                studentEmail: `stress.test.${i + 1}@example.com`,
                startTime,
            });

            const bWithCoach = await prisma.booking.findUnique({
                where: { id: booking.id },
                include: { coach: true }
            });

            const hostName = bWithCoach?.coach ? `${bWithCoach.coach.firstName} ${bWithCoach.coach.lastName}` : "Unknown";
            const hostId = bWithCoach?.coachUserId;

            results.push({
                bookingNumber: i + 1,
                slotStart: startTime,
                student: `Stress Test Student ${i + 1}`,
                host: hostName,
                hostId,
                status: "SUCCESS"
            });

            console.log(`Done. Assigned to: ${hostName}`);
        } catch (error: any) {
            console.log(`FAILED: ${error.message}`);
            results.push({
                bookingNumber: i + 1,
                slotStart: startTime,
                student: `Stress Test Student ${i + 1}`,
                host: "N/A",
                status: "FAILED",
                error: error.message
            });
        }
    }

    console.log("\n--- STRESS TEST COMPLETE ---");
    console.log(JSON.stringify(results, null, 2));
}

runStressTest()
    .catch(err => console.error(err))
    .finally(() => prisma.$disconnect());
