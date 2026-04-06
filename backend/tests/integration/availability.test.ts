import request from "supertest";
import app from "../../src/app";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";

let superAdminToken: string;
let superAdminId: string;
let coachToken: string;
let coachId: string;
let visitorToken: string;
let visitorId: string;

beforeAll(async () => {
    await clearTables();

    const admin = await bootstrapAdmin("super-avail@example.com", "Admin1234");
    superAdminToken = admin.token;
    superAdminId = admin.id;

    const coach = await registerUser(superAdminToken, {
        firstName: "Coach",
        lastName: "User",
        email: "coach-avail@example.com",
        password: "Password1234",
        role: "COACH",
    });
    coachToken = coach.token;
    coachId = coach.id;

    const visitor = await registerUser(superAdminToken, {
        firstName: "Visitor",
        lastName: "User",
        email: "visitor-avail@example.com",
        password: "Password1234",
        role: "COACH",
    });
    visitorToken = visitor.token;
    visitorId = visitor.id;
});

afterAll(clearTables);

describe("Availability Domain Integration Tests", () => {
    describe("Weekly Availability", () => {
        it("COACH cannot set their own weekly availability (Policy Change)", async () => {
            const slots = [
                { dayOfWeek: 1, startTime: "09:00", endTime: "12:00" },
            ];

            const res = await request(app)
                .post(`/api/users/${coachId}/availability/weekly`)
                .set("Authorization", `Bearer ${coachToken}`)
                .send(slots);

            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/Coaches are not allowed to manage/);
        });

        it("COACH can get their own weekly availability", async () => {
            // Setup: Admin sets the availability first
            await request(app)
                .post(`/api/users/${coachId}/availability/weekly`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send([
                    { dayOfWeek: 1, startTime: "09:00", endTime: "12:00" },
                    { dayOfWeek: 1, startTime: "13:00", endTime: "17:00" },
                ]);

            const res = await request(app)
                .get(`/api/users/${coachId}/availability/weekly`)
                .set("Authorization", `Bearer ${coachToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(2);
        });

        it("COACH cannot set another user's availability", async () => {
            const res = await request(app)
                .post(`/api/users/${visitorId}/availability/weekly`)
                .set("Authorization", `Bearer ${coachToken}`)
                .send([]);

            expect(res.status).toBe(403);
        });

        it("SUPER_ADMIN can set any user's availability", async () => {
            const res = await request(app)
                .post(`/api/users/${visitorId}/availability/weekly`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send([{ dayOfWeek: 0, startTime: "10:00", endTime: "11:00" }]);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
        });

        it("rejects invalid time format (403 before 400 for COACH)", async () => {
            const res = await request(app)
                .post(`/api/users/${coachId}/availability/weekly`)
                .set("Authorization", `Bearer ${coachToken}`)
                .send([{ dayOfWeek: 1, startTime: "9:00", endTime: "17:00" }]); // Should be 09:00

            expect(res.status).toBe(403);
        });

        it("rejects startTime after endTime (as Admin)", async () => {
            const res = await request(app)
                .post(`/api/users/${coachId}/availability/weekly`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send([{ dayOfWeek: 1, startTime: "17:00", endTime: "09:00" }]);

            expect(res.status).toBe(400);
        });
    });

    describe("Availability Exceptions", () => {
        let exceptionId: string;

        it("adds an availability exception", async () => {
            const res = await request(app)
                .post(`/api/users/${coachId}/availability/exceptions`)
                .set("Authorization", `Bearer ${coachToken}`)
                .send({
                    date: "2026-12-25",
                    isUnavailable: true,
                });

            expect(res.status).toBe(201);
            expect(res.body.data.isUnavailable).toBe(true);
            exceptionId = res.body.data.id;
        });

        it("lists availability exceptions", async () => {
            const res = await request(app)
                .get(`/api/users/${coachId}/availability/exceptions`)
                .set("Authorization", `Bearer ${coachToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
        });

        it("removes an availability exception", async () => {
            const res = await request(app)
                .delete(`/api/users/${coachId}/availability/exceptions/${exceptionId}`)
                .set("Authorization", `Bearer ${coachToken}`);

            expect(res.status).toBe(200);

            const listRes = await request(app)
                .get(`/api/users/${coachId}/availability/exceptions`)
                .set("Authorization", `Bearer ${coachToken}`);
            expect(listRes.body.data).toHaveLength(0);
        });

        it("returns 404 when removing non-existent exception", async () => {
            const res = await request(app)
                .delete(`/api/users/${coachId}/availability/exceptions/00000000-0000-0000-0000-000000000000`)
                .set("Authorization", `Bearer ${coachToken}`);

            expect(res.status).toBe(404);
        });
    });

    describe("Effective Availability", () => {
        it("calculates effective availability", async () => {
            const res = await request(app)
                .get(`/api/users/${coachId}/availability/effective?from=2026-03-01&to=2026-03-31`)
                .set("Authorization", `Bearer ${coachToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty("weekly");
            expect(res.body.data).toHaveProperty("exceptions");
        });

        it("rejects missing query parameters", async () => {
            const res = await request(app)
                .get(`/api/users/${coachId}/availability/effective`)
                .set("Authorization", `Bearer ${coachToken}`);

            expect(res.status).toBe(400);
        });
    });
});
