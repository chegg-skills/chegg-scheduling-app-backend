import { BookingStatus, BookingActivityType, BookingActivityActor } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";

async function backfill() {
  console.log("🚀 Starting BookingActivity backfill...");

  const bookings = await prisma.booking.findMany({
    include: {
      sessionLog: {
        include: {
          attendance: true,
          loggedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      coach: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  console.log(`📦 Found ${bookings.length} bookings to process.`);

  let createdCount = 0;

  for (const booking of bookings) {
    const existingCount = await prisma.bookingActivity.count({
      where: { bookingId: booking.id },
    });

    if (existingCount > 0) {
      console.log(`⏩ Skipping booking ${booking.id} (already has activity logs)`);
      continue;
    }

    // 1. Create BOOKING_CREATED activity
    await prisma.bookingActivity.create({
      data: {
        bookingId: booking.id,
        activityType: BookingActivityType.BOOKING_CREATED,
        actorType: BookingActivityActor.STUDENT,
        actorName: booking.studentName,
        timestamp: booking.createdAt,
        metadata: {
          startTime: booking.startTime,
          endTime: booking.endTime,
          coachUserId: booking.coachUserId,
          note: "Reconstructed via backfill",
        },
      },
    });

    // 2. Create BOOKING_CONFIRMED activity
    // (Bookings are confirmed on creation in this system unless cancelled)
    await prisma.bookingActivity.create({
      data: {
        bookingId: booking.id,
        activityType: BookingActivityType.BOOKING_CONFIRMED,
        actorType: BookingActivityActor.SYSTEM,
        actorName: "System",
        timestamp: booking.createdAt,
      },
    });

    // 3. Handle CANCELLATION
    if (booking.status === BookingStatus.CANCELLED) {
      await prisma.bookingActivity.create({
        data: {
          bookingId: booking.id,
          activityType: BookingActivityType.BOOKING_CANCELLED,
          actorType: BookingActivityActor.SYSTEM,
          actorName: "System",
          timestamp: booking.updatedAt,
          metadata: {
            cancellationReason: booking.cancellationReason,
          },
        },
      });
    }

    // 4. Handle SESSION NOTES / LOGGING
    if (booking.sessionLog) {
      const log = booking.sessionLog;
      const loggedByName = log.loggedBy
        ? `${log.loggedBy.firstName} ${log.loggedBy.lastName}`.trim()
        : "Unknown Coach";

      await prisma.bookingActivity.create({
        data: {
          bookingId: booking.id,
          activityType: BookingActivityType.SESSION_LOGGED,
          actorType: BookingActivityActor.COACH,
          actorUserId: log.loggedByUserId,
          actorName: loggedByName,
          timestamp: log.createdAt,
          metadata: {
            topicsDiscussed: log.topicsDiscussed,
            summary: log.summary,
          },
        },
      });

      const attended = log.attendance[0]?.attended ?? (booking.status === BookingStatus.COMPLETED);
      await prisma.bookingActivity.create({
        data: {
          bookingId: booking.id,
          activityType: BookingActivityType.ATTENDANCE_UPDATED,
          actorType: BookingActivityActor.COACH,
          actorUserId: log.loggedByUserId,
          actorName: loggedByName,
          timestamp: log.createdAt,
          metadata: {
            attended,
          },
        },
      });

      if (booking.status === BookingStatus.COMPLETED || booking.status === BookingStatus.NO_SHOW) {
        await prisma.bookingActivity.create({
          data: {
            bookingId: booking.id,
            activityType:
              booking.status === BookingStatus.COMPLETED
                ? BookingActivityType.SESSION_COMPLETED
                : BookingActivityType.SESSION_NO_SHOW,
            actorType: BookingActivityActor.COACH,
            actorUserId: log.loggedByUserId,
            actorName: loggedByName,
            timestamp: log.createdAt,
          },
        });
      }
    } else {
      // If there is no session notes but the status was somehow moved to COMPLETED or NO_SHOW
      if (booking.status === BookingStatus.COMPLETED || booking.status === BookingStatus.NO_SHOW) {
        await prisma.bookingActivity.create({
          data: {
            bookingId: booking.id,
            activityType:
              booking.status === BookingStatus.COMPLETED
                ? BookingActivityType.SESSION_COMPLETED
                : BookingActivityType.SESSION_NO_SHOW,
            actorType: BookingActivityActor.SYSTEM,
            actorName: "System",
            timestamp: booking.updatedAt,
          },
        });
      }
    }

    createdCount++;
  }

  console.log(`✨ Backfill complete! Reconstructed history for ${createdCount} bookings.`);
}

backfill()
  .catch((e) => {
    console.error("❌ Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
