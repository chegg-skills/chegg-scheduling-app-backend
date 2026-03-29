import request from "supertest";
import app from "../../src/app";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";

let superAdminToken: string;
let teamAdminId: string;
let teamId: string;
let eventId: string;

beforeAll(async () => {
    await clearTables();

    const admin = await bootstrapAdmin("super@public.com", "Admin1234");
    superAdminToken = admin.token;

    // Create Offering
    const offeringRes = await request(app)
        .post("/api/event-offerings")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
            key: "public-offering",
            name: "Public Offering",
            description: "Offering for public",
            sortOrder: 1,
            isActive: true,
        });
    const offeringId = offeringRes.body.data.id;

    // Create Interaction Type
    const interactionRes = await request(app)
        .post("/api/event-interaction-types")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
            key: "one-to-one",
            name: "One-to-One",
            description: "Interaction type",
            supportsRoundRobin: false,
            supportsMultipleHosts: false,
            minHosts: 1,
            maxHosts: 1,
            minParticipants: 1,
            maxParticipants: 1,
            sortOrder: 1,
            isActive: true,
        });
    const interactionTypeId = interactionRes.body.data.id;

    const teamAdmin = await registerUser(superAdminToken, {
        firstName: "Team",
        lastName: "Admin",
        email: "teamadmin@public.com",
        password: "TeamAdmin1234",
        role: "TEAM_ADMIN",
    });
    teamAdminId = teamAdmin.id;

    // Create a team
    const teamRes = await request(app)
        .post("/api/teams")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ name: "Public Team", description: "Discoverable team", teamLeadId: teamAdminId });
    teamId = teamRes.body.data.id;

    // Create an event via API
    const eventRes = await request(app)
        .post(`/api/teams/${teamId}/events`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
            name: "Public Intro",
            description: "Intro session",
            durationSeconds: 1800,
            locationType: "VIRTUAL",
            locationValue: "https://meet.example.com/session",
            isActive: true,
            offeringId,
            interactionTypeId,
            hostUserIds: [teamAdminId]
        });

    eventId = eventRes.body.data.id;
});

afterAll(clearTables);

describe("Public API", () => {
    describe("GET /api/public/teams", () => {
        it("should list active teams without authentication", async () => {
            const res = await request(app).get("/api/public/teams");
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.teams).toBeDefined();
            expect(res.body.data.teams.length).toBeGreaterThanOrEqual(1);
            expect(res.body.data.teams[0].name).toBe("public team");
        });
    });

    describe("GET /api/public/teams/:teamId/events", () => {
        it("should list active events for a team without authentication", async () => {
            const res = await request(app).get(`/api/public/teams/${teamId}/events`);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.events).toBeDefined();
            expect(res.body.data.events.length).toBeGreaterThanOrEqual(1);
            expect(res.body.data.events[0].name).toBe("Public Intro");
        });
    });

    describe("GET /api/public/events/:eventId/slots", () => {
        it("should return available slots without authentication", async () => {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(startDate.getDate() + 7);

            const res = await request(app)
                .get(`/api/public/events/${eventId}/slots`)
                .query({
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString()
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data.slots)).toBe(true);
        });

        it("should return 400 if dates are missing", async () => {
            const res = await request(app).get(`/api/public/events/${eventId}/slots`);
            expect(res.status).toBe(400);
        });
    });
});
