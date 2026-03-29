import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/shared/db/prisma";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";
import { AssignmentStrategy, BookingStatus, EventLocationType } from "@prisma/client";

let adminToken: string;
let teamId: string;
let offeringId: string;
let interactionTypeId: string;
let coachId: string;
let coachToken: string;
let coach2Id: string;

beforeAll(async () => {
    await clearTables();

    const admin = await bootstrapAdmin("admin@test.com", "Admin1234");
    adminToken = admin.token;

    // Create Team
    const team = await prisma.team.create({
        data: {
            name: "Test Team",
            createdById: admin.id,
            teamLeadId: admin.id,
        },
    });
    teamId = team.id;

    // Create Coach 1
    const coach = await registerUser(adminToken, {
        firstName: "Coach",
        lastName: "One",
        email: "coach1@test.com",
        password: "Coach1234",
        role: "COACH",
    });
    coachId = coach.id;
    coachToken = coach.token;

    // Create Coach 2
    const coach2 = await registerUser(adminToken, {
        firstName: "Coach",
        lastName: "Two",
        email: "coach2@test.com",
        password: "Coach1234",
        role: "COACH",
    });
    coach2Id = coach2.id;

    // Create Offering
    const offering = await prisma.eventOffering.create({
        data: {
            key: "test_offering",
            name: "Test Offering",
            createdById: admin.id,
            updatedById: admin.id,
        },
    });
    offeringId = offering.id;

    // Create Interaction Type (with Round-Robin support)
    const interactionType = await prisma.eventInteractionType.create({
        data: {
            key: "test_interaction",
            name: "Test Interaction",
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

describe("Booking Domain Integration Tests", () => {
    let eventId: string;

    beforeEach(async () => {
        // Clean bookings before each test if needed, but clearTables is in afterAll/beforeAll.
        // For individual tests, we'll create dedicated events.
        const event = await prisma.event.create({
            data: {
                name: "Test Direct Event",
                teamId,
                offeringId,
                interactionTypeId,
                assignmentStrategy: AssignmentStrategy.DIRECT,
                durationSeconds: 3600, // 1 hour
                locationType: EventLocationType.VIRTUAL,
                locationValue: "Zoom",
                createdById: coachId,
                updatedById: coachId,
                hosts: {
                    create: {
                        hostUserId: coachId,
                        hostOrder: 1
                    }
                }
            }
        });
        eventId = event.id;
    });

    afterEach(async () => {
        await prisma.booking.deleteMany();
        await prisma.userWeeklyAvailability.deleteMany();
        await prisma.userAvailabilityException.deleteMany();
        await prisma.event.deleteMany();
    });

    describe("POST /api/bookings (DIRECT)", () => {
        beforeEach(async () => {
            // Set Coach Availability: Monday 09:00 - 17:00
            await prisma.userWeeklyAvailability.create({
                data: {
                    userId: coachId,
                    dayOfWeek: 1, // Monday
                    startTime: "09:00",
                    endTime: "17:00"
                }
            });
        });

        it("successfully creates a booking for an available slot", async () => {
            // Monday at 10:00 AM UTC (Assuming host is in UTC for simplicity in test setup)
            // Actually isHostAvailable gets the host TZ. Coach default is UTC.
            const startTime = "2026-03-30T10:00:00Z"; // This is a Monday

            const res = await request(app)
                .post("/api/bookings")
                .send({
                    studentName: "John Doe",
                    studentEmail: "john@example.com",
                    teamId,
                    eventId,
                    startTime,
                    timezone: "UTC"
                });

            if (res.status !== 201) console.log(JSON.stringify(res.body, null, 2));
            expect(res.status).toBe(201);
            expect(res.body.data.booking.studentName).toBe("John Doe");
            expect(res.body.data.booking.hostUserId).toBe(coachId);
        });

        it("returns 409 conflict if host is unavailable (outside weekly schedule)", async () => {
            const startTime = "2026-03-30T18:00:00Z"; // Monday 6 PM (Schedule ends at 5 PM)

            const res = await request(app)
                .post("/api/bookings")
                .send({
                    studentName: "John Doe",
                    studentEmail: "john@example.com",
                    teamId,
                    eventId,
                    startTime,
                });

            expect(res.status).toBe(409);
            expect(res.body.message).toContain("not available");
        });

        it("returns 409 conflict if there is a booking overlap", async () => {
            const startTime = "2026-03-30T10:00:00Z";

            // Create existing booking
            await prisma.booking.create({
                data: {
                    studentName: "First One",
                    studentEmail: "first@example.com",
                    teamId,
                    eventId,
                    hostUserId: coachId,
                    startTime: new Date(startTime),
                    endTime: new Date(new Date(startTime).getTime() + 3600 * 1000),
                    status: "CONFIRMED"
                }
            });

            const res = await request(app)
                .post("/api/bookings")
                .send({
                    studentName: "John Doe",
                    studentEmail: "john@example.com",
                    teamId,
                    eventId,
                    startTime,
                });

            expect(res.status).toBe(409);
            expect(res.body.message).toContain("not available");
        });
    });

    describe("POST /api/bookings (ROUND-ROBIN)", () => {
        let rrEventId: string;

        beforeEach(async () => {
            const event = await prisma.event.create({
                data: {
                    name: "Test RR Event",
                    teamId,
                    offeringId,
                    interactionTypeId,
                    assignmentStrategy: AssignmentStrategy.ROUND_ROBIN,
                    durationSeconds: 3600,
                    locationType: EventLocationType.VIRTUAL,
                    locationValue: "Zoom",
                    createdById: coachId,
                    updatedById: coachId,
                    hosts: {
                        create: [
                            { hostUserId: coachId, hostOrder: 1 },
                            { hostUserId: coach2Id, hostOrder: 2 }
                        ]
                    }
                }
            });
            rrEventId = event.id;

            // Set Coach 1: Monday 09:00 - 12:00
            await prisma.userWeeklyAvailability.create({
                data: { userId: coachId, dayOfWeek: 1, startTime: "09:00", endTime: "12:00" }
            });
            // Set Coach 2: Monday 13:00 - 17:00
            await prisma.userWeeklyAvailability.create({
                data: { userId: coach2Id, dayOfWeek: 1, startTime: "13:00", endTime: "17:00" }
            });
        });

        it("assigns the first available host and updates routing state", async () => {
            const startTime = "2026-03-30T09:30:00Z"; // Monday 9:30 AM (Coach 1 available)

            const res = await request(app)
                .post("/api/bookings")
                .send({
                    studentName: "Student RR",
                    studentEmail: "stu@rr.com",
                    teamId,
                    eventId: rrEventId,
                    startTime,
                });

            expect(res.status).toBe(201);
            expect(res.body.data.booking.hostUserId).toBe(coachId);

            // Routing state should now point to hostOrder 2
            const routing = await prisma.eventRoutingState.findUnique({ where: { eventId: rrEventId } });
            expect(routing?.nextHostOrder).toBe(2);
        });

        it("skips unavailable host and assigns the next available one", async () => {
            const startTime = "2026-03-30T14:00:00Z"; // Coach 1 out, Coach 2 available

            const res = await request(app)
                .post("/api/bookings")
                .send({
                    studentName: "Student RR 2",
                    studentEmail: "stu2@rr.com",
                    teamId,
                    eventId: rrEventId,
                    startTime,
                });

            expect(res.status).toBe(201);
            expect(res.body.data.booking.hostUserId).toBe(coach2Id);
        });
    });
});
