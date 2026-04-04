import { prisma } from "../src/shared/db/prisma";
import { createBooking } from "../src/domain/bookings/booking.service";
import { StatusCodes } from "http-status-codes";

async function main() {
    console.log("🔍 Testing createBooking service directly to capture error message...");

    // Fetch a valid event, team, and host to construct a realistic (or slightly off) payload
    const event = await prisma.event.findFirst({
        where: { isActive: true },
        include: { hosts: true }
    });

    if (!event) {
        console.error("❌ No active events found in DB to test with.");
        return;
    }

    const hostId = event.hosts[0]?.hostUserId;
    const startTime = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days in future

    const payload = {
        studentName: "Test Student",
        studentEmail: "invalid-email",
        teamId: event.teamId,
        eventId: event.id,
        startTime,
        timezone: "UTC",
        preferredHostId: hostId
    };

    console.log("Payload:", JSON.stringify(payload, null, 2));

    try {
        const booking = await createBooking(payload as any);
        console.log("✅ Success! Booking created:", booking.id);
    } catch (error: any) {
        if (error.statusCode) {
            console.log(`❌ Caught Expected Error [${error.statusCode}]: ${error.message}`);
        } else {
            console.error("❌ Unexpected Error:", error);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
