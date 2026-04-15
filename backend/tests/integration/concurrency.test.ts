import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/shared/db/prisma";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";
import { AssignmentStrategy, EventLocationType } from "@prisma/client";

const getNextUtcWeekdayAt = (targetDay: number, hour: number, minute = 0): Date => {
  const now = new Date();
  const currentDay = now.getUTCDay();
  const daysAhead = (targetDay - currentDay + 7) % 7 || 7;
  const target = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysAhead,
      hour,
      minute,
      0,
      0,
    ),
  );
  return target;
};

describe("Concurrency Integration Tests", () => {
  let adminToken: string;
  let teamId: string;
  let offeringId: string;
  let interactionTypeId: string;
  let coachId: string;
  let eventId: string;

  beforeAll(async () => {
    await clearTables();

    const admin = await bootstrapAdmin("admin@concurrency.com", "Admin1234");
    adminToken = admin.token;

    const team = await prisma.team.create({
      data: {
        name: "Concurrency Team",
        createdById: admin.id,
        teamLeadId: admin.id,
        publicBookingSlug: "concurrency-team",
      },
    });
    teamId = team.id;

    const coach = await registerUser(adminToken, {
      firstName: "Concurrency",
      lastName: "Coach",
      email: "coach.concurrency@test.com",
      password: "Coach1234",
      role: "COACH",
    });
    coachId = coach.id;

    const offering = await prisma.eventOffering.create({
      data: {
        key: "concurrency_offering",
        name: "Concurrency Offering",
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
    offeringId = offering.id;

    const interactionType = await prisma.eventInteractionType.create({
      data: {
        key: "concurrency_interaction",
        name: "Concurrency Interaction",
        supportsRoundRobin: true,
        supportsMultipleHosts: true,
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
    interactionTypeId = interactionType.id;
  });

  afterAll(async () => {
    await clearTables();
  });

  beforeEach(async () => {
    // Create an event with a single seat
    const event = await prisma.event.create({
      data: {
        name: "Concurrency Test Event",
        teamId,
        offeringId,
        interactionTypeId,
        assignmentStrategy: AssignmentStrategy.DIRECT,
        durationSeconds: 3600,
        locationType: EventLocationType.VIRTUAL,
        locationValue: "Zoom",
        createdById: coachId,
        updatedById: coachId,
        publicBookingSlug: `concurrency-event-${Date.now()}`,
        hosts: {
          create: {
            hostUserId: coachId,
            hostOrder: 1,
          },
        },
        bookingMode: "FIXED_SLOTS",
        maxParticipantCount: 1, // EXACTLY 1 SEAT
      },
    });
    eventId = event.id;

    // Set Coach Availability
    await prisma.userWeeklyAvailability.create({
      data: {
        userId: coachId,
        dayOfWeek: 1, // Monday
        startTime: "00:00",
        endTime: "23:59",
      },
    });
  });

  afterEach(async () => {
    await prisma.booking.deleteMany();
    await prisma.eventScheduleSlot.deleteMany();
    await prisma.userWeeklyAvailability.deleteMany();
    await prisma.event.deleteMany();
  });

  it("should NOT allow double-booking the same slot under high concurrency", async () => {
    const slotStart = getNextUtcWeekdayAt(1, 10, 0);
    const slotEnd = new Date(slotStart.getTime() + 3600 * 1000);

    // Create a fixed slot
    const scheduleSlot = await prisma.eventScheduleSlot.create({
      data: {
        eventId,
        startTime: slotStart,
        endTime: slotEnd,
      },
    });

    // Fire 10 simultaneous booking requests
    const requests = Array.from({ length: 10 }).map((_, i) =>
      request(app)
        .post("/api/bookings")
        .send({
          studentName: `Student ${i}`,
          studentEmail: `student${i}@test.com`,
          teamId,
          eventId,
          startTime: slotStart.toISOString(),
          timezone: "UTC",
        }),
    );

    const responses = await Promise.all(requests);

    const successfulBookings = responses.filter((r) => r.status === 201);
    const conflictErrors = responses.filter((r) => r.status === 409);

    console.log(`Successful bookings: ${successfulBookings.length}`);
    console.log(`Conflict errors: ${conflictErrors.length}`);

    // WITHOUT FIX: This might be > 1
    // WITH FIX: This MUST be exactly 1
    expect(successfulBookings.length).toBe(1);
    expect(conflictErrors.length).toBe(9);

    // Verify database state
    const dbBookings = await prisma.booking.count({
      where: {
        eventId,
        startTime: slotStart,
        status: { not: "CANCELLED" },
      },
    });
    expect(dbBookings).toBe(1);
  }, 30000); // Higher timeout for concurrency test
});
