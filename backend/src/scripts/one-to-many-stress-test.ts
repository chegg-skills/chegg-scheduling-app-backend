import { prisma } from "../shared/db/prisma";
import { createBooking } from "../domain/bookings/booking.service";

async function runOneToManyStressTest() {
    const eventId = "03d2d844-3936-48fa-9e94-bcc9119d2c76";
    const teamId = "d077f525-d9db-48a7-a9e3-c4caf59e5d5f";
    const startTime = "2026-04-30T06:40:00.000Z";

    console.log(`Starting 20-booking One-To-Many stress test for event ${eventId}...`);

    const results = [];

    for (let i = 0; i < 20; i++) {
        const studentName = `Group Student ${i + 1}`;
        const studentEmail = `group.student.${i + 1}@example.com`;

        process.stdout.write(`Booking ${i + 1}/20... `);

        try {
            const booking = await createBooking({
                teamId,
                eventId,
                studentName,
                studentEmail,
                startTime,
            });

            const bWithCoach = await prisma.booking.findUnique({
                where: { id: booking.id },
                include: { coach: true }
            });

            const hostName = bWithCoach?.coach ? `${bWithCoach.coach.firstName} ${bWithCoach.coach.lastName}` : "Unknown";

            results.push({
                bookingNumber: i + 1,
                student: studentName,
                host: hostName,
                status: "SUCCESS"
            });

            console.log(`Done. Assigned to: ${hostName}`);
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

    console.log("\n--- ONE-TO-MANY STRESS TEST COMPLETE ---");
    console.log(JSON.stringify(results, null, 2));
}

runOneToManyStressTest()
    .catch(err => console.error(err))
    .finally(() => prisma.$disconnect());
