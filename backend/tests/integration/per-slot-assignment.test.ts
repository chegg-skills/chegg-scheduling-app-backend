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

describe("Per-Slot Coach Assignment Integration Tests", () => {
    let adminToken: string;
    let teamId: string;
    let offeringId: string;
    let coach1Id: string;
    let coach2Id: string;

    beforeAll(async () => {
        await clearTables();
        const admin = await bootstrapAdmin("admin@test.com", "Admin1234");
        adminToken = admin.token;

        const team = await prisma.team.create({
            data: {
                name: "Test Team",
                createdById: admin.id,
                teamLeadId: admin.id,
                publicBookingSlug: "test-team",
            },
        });
        teamId = team.id;

        coach1Id = (await registerUser(adminToken, {
            firstName: "Coach", lastName: "One", email: "coach1@test.com", password: "Password123", role: "COACH"
        })).id;

        coach2Id = (await registerUser(adminToken, {
            firstName: "Coach", lastName: "Two", email: "coach2@test.com", password: "Password123", role: "COACH"
        })).id;

        offeringId = (await prisma.eventOffering.create({
            data: { key: "slot_test", name: "Slot Test", createdById: admin.id, updatedById: admin.id }
        })).id;
    });

    afterAll(async () => {
        await clearTables();
    });

    afterEach(async () => {
        await prisma.booking.deleteMany();
        await prisma.eventScheduleSlot.deleteMany();
        await prisma.event.deleteMany();
        await prisma.userWeeklyAvailability.deleteMany();
    });

    it("should prioritize slot-specific coach in a DIRECT assignment event", async () => {
        // Event is assigned to Coach 1 by default
        const event = await prisma.event.create({
            data: {
                name: "Direct Event",
                teamId,
                offeringId,
                interactionType: "ONE_TO_ONE",
                assignmentStrategy: AssignmentStrategy.DIRECT,
                durationSeconds: 3600,
                locationType: EventLocationType.VIRTUAL,
                locationValue: "Zoom",
                createdById: coach1Id,
                updatedById: coach1Id,
                publicBookingSlug: "direct-slot-test",
                bookingMode: "FIXED_SLOTS",
                coaches: { create: { coachUserId: coach1Id, coachOrder: 1 } }
            }
        });

        const startTime = getNextUtcWeekdayAt(1, 10, 0);
        const endTime = new Date(startTime.getTime() + 3600000);

        // Create a slot assigned to Coach 2
        const slot = await prisma.eventScheduleSlot.create({
            data: {
                eventId: event.id,
                startTime,
                endTime,
                assignedCoachId: coach2Id
            } as any
        });

        // Make Coach 2 available
        await prisma.userWeeklyAvailability.create({
            data: { userId: coach2Id, dayOfWeek: 1, startTime: "08:00", endTime: "18:00" }
        });

        const res = await request(app).post("/api/bookings").send({
            studentName: "Test Student",
            studentEmail: "student@test.com",
            teamId,
            eventId: event.id,
            startTime: startTime.toISOString(),
            timezone: "UTC"
        });

        expect(res.status).toBe(201);
        expect(res.body.data.booking.coachUserId).toBe(coach2Id); // Should be Coach 2, not Coach 1
    });

    it("should prioritize slot-specific coach in a ROUND_ROBIN assignment event", async () => {
        const event = await prisma.event.create({
            data: {
                name: "RR Event",
                teamId,
                offeringId,
                interactionType: "ONE_TO_ONE",
                assignmentStrategy: AssignmentStrategy.ROUND_ROBIN,
                durationSeconds: 3600,
                locationType: EventLocationType.VIRTUAL,
                locationValue: "Zoom",
                createdById: coach1Id,
                updatedById: coach1Id,
                publicBookingSlug: "rr-slot-test",
                bookingMode: "FIXED_SLOTS",
                coaches: {
                    create: [
                        { coachUserId: coach1Id, coachOrder: 1 },
                        { coachUserId: coach2Id, coachOrder: 2 }
                    ]
                }
            }
        });

        const startTime = getNextUtcWeekdayAt(2, 14, 0); // Tuesday
        const endTime = new Date(startTime.getTime() + 3600000);

        // Explicitly assign Coach 1 to this slot
        await prisma.eventScheduleSlot.create({
            data: {
                eventId: event.id,
                startTime,
                endTime,
                assignedCoachId: coach1Id
            } as any
        });

        // Make both available
        await prisma.userWeeklyAvailability.createMany({
            data: [
                { userId: coach1Id, dayOfWeek: 2, startTime: "08:00", endTime: "18:00" },
                { userId: coach2Id, dayOfWeek: 2, startTime: "08:00", endTime: "18:00" }
            ]
        });

        // Force routing state to point to Coach 2 (so normal RR would pick Coach 2)
        await prisma.eventRoutingState.upsert({
            where: { eventId: event.id },
            update: { nextCoachOrder: 2 },
            create: { eventId: event.id, nextCoachOrder: 2 }
        });

        const res = await request(app).post("/api/bookings").send({
            studentName: "Test Student",
            studentEmail: "student@test.com",
            teamId,
            eventId: event.id,
            startTime: startTime.toISOString(),
            timezone: "UTC"
        });

        expect(res.status).toBe(201);
        expect(res.body.data.booking.coachUserId).toBe(coach1Id); // Should pick Coach 1 because of slot assignment
    });
});
