import request from "supertest";
import app from "../../src/app";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";
import { prisma } from "../../src/shared/db/prisma";

let adminToken: string;
let coachId: string;
let teamId: string;
let offeringId: string;
let interactionTypeId: string;
let eventId: string;

beforeAll(async () => {
    await clearTables();

    // 1. Setup Admin & Coach
    const admin = await bootstrapAdmin("admin-buffer@example.com", "Admin1234");
    adminToken = admin.token;

    const coach = await registerUser(adminToken, {
        firstName: "Buffer",
        lastName: "Coach",
        email: "coach-buffer@example.com",
        password: "Password1234",
        role: "TEAM_ADMIN",
    });
    coachId = coach.id;

    // 2. Setup Team
    const teamRes = await request(app)
        .post("/api/teams")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            name: "Buffer Team",
            description: "Testing buffers",
            teamLeadId: coachId,
        });
    teamId = teamRes.body.data.id;

    // 3. Setup Offering & Interaction Type
    const offeringRes = await request(app)
        .post("/api/event-offerings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Buffer Offering", key: "buffer_offering" });
    offeringId = offeringRes.body.data.id;

    const interactionRes = await request(app)
        .post("/api/event-interaction-types")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            name: "Buffer Interaction",
            key: "buffer_int",
            supportsSimultaneousCoaches: false,
            minHosts: 1,
            maxHosts: 1,
            minParticipants: 1,
            maxParticipants: 1
        });
    interactionTypeId = interactionRes.body.data.id;

    // 4. Create Event with 15-minute buffer
    const eventRes = await request(app)
        .post(`/api/teams/${teamId}/events`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            name: "Buffered Event",
            offeringId,
            interactionTypeId,
            durationSeconds: 3600, // 1 hour
            locationType: "VIRTUAL",
            locationValue: "Zoom",
            bufferAfterMinutes: 15, // 15 min buffer!
        });
    eventId = eventRes.body.data.id;

    // 5. Assign Coach to Event
    await request(app)
        .put(`/api/events/${eventId}/hosts`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            hosts: [{ userId: coachId, hostOrder: 1 }]
        });

    // 6. Set Coach Availability (Monday 9:00 - 12:00)
    await request(app)
        .post(`/api/users/${coachId}/availability/weekly`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send([{ dayOfWeek: 1, startTime: "08:00", endTime: "14:00" }]);
});

afterAll(clearTables);

describe("Event Buffer Integration Tests", () => {
    it("respects bufferAfterMinutes when calculating available slots", async () => {
        // Setup: Book a session from 10:00 to 11:00 on a Monday
        // 2026-12-07 is a Monday
        const startTime = new Date("2026-12-07T10:00:00Z");
        const endTime = new Date("2026-12-07T11:00:00Z");

        await prisma.booking.create({
            data: {
                studentName: "Test Student",
                studentEmail: "student@example.com",
                teamId,
                eventId,
                hostUserId: coachId,
                startTime,
                endTime,
                status: "CONFIRMED",
            }
        });

        // Request available slots for that Monday
        const res = await request(app)
            .get(`/api/public/events/${eventId}/slots?startDate=2026-12-07&endDate=2026-12-07`)
            .expect(200);

        const slots = res.body.data.slots;

        // With a 1-hour session from 10:00 to 11:00 and a 15-min buffer:
        // 1. Slot at 09:00 - 10:00 should be visible (ends exactly when booking starts)
        // 2. Slot at 09:15 - 10:15 should NOT be visible (overlaps with 10:00 booking)
        // 3. Slot at 11:00 - 12:00 should NOT be visible (overlaps with 11:00-11:15 buffer)
        // 4. Slot at 11:15 - 12:15 should NOT be visible (ends at 12:15, coach only free till 12:00)

        const startTimes = slots.map((s: any) => s.startTime);

        // 1. Ensure 11:00 is NOT present (coach is busy with 10:00 booking + 15m buffer till 11:15)
        const elevenAM = "2026-12-07T11:00:00.000Z";
        expect(startTimes).not.toContain(elevenAM);

        // 2. Ensure 11:15 IS present (starts exactly after 10:00 booking's buffer)
        const elevenFifteenAM = "2026-12-07T11:15:00.000Z";
        expect(startTimes).toContain(elevenFifteenAM);

        // 3. Ensure 09:00 IS NOT present (it needs 10:00-10:15 free for its own buffer, but 10:00 booking starts)
        const nineAM = "2026-12-07T09:00:00.000Z";
        expect(startTimes).not.toContain(nineAM);

        // 4. Ensure 08:45 IS present (ends at 09:45, its buffer 09:45-10:00 is free)
        const eightFortyFiveAM = "2026-12-07T08:45:00.000Z";
        expect(startTimes).toContain(eightFortyFiveAM);

        // Ensure no slots actually overlap with the [10:00, 11:15] busy window
        slots.forEach((slot: any) => {
            const s = new Date(slot.startTime);
            const e = new Date(slot.endTime);
            const isOverlap = s < new Date("2026-12-07T11:15:00Z") && new Date("2026-12-07T10:00:00Z") < e;
            expect(isOverlap).toBe(false);
        });
    });
});
