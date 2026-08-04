import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/shared/db/prisma";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";

let superAdminToken: string;
let teamAdminToken: string;
let coachToken: string;

// clearTables() does not touch these SUPER_ADMIN-only tables, so isolate them here.
const clearSettings = async () => {
  await prisma.systemBookingQuestion.deleteMany();
  await prisma.systemSetting.deleteMany();
};

beforeAll(async () => {
  await clearTables();
  await clearSettings();

  const admin = await bootstrapAdmin("super@settings.com", "Admin1234");
  superAdminToken = admin.token;

  const teamAdmin = await registerUser(superAdminToken, {
    firstName: "Team",
    lastName: "Admin",
    email: "teamadmin@settings.com",
    password: "TeamAdmin1234",
    role: "TEAM_ADMIN",
  });
  teamAdminToken = teamAdmin.token;

  const coach = await registerUser(superAdminToken, {
    firstName: "A",
    lastName: "Coach",
    email: "coach@settings.com",
    password: "Coach1234",
    role: "COACH",
  });
  coachToken = coach.token;
});

// Each test starts from a clean settings/questions state.
beforeEach(clearSettings);

afterAll(async () => {
  await clearSettings();
  await clearTables();
});

// ─────────────────────────────────────────────────────────────
// GET / PUT /api/system-settings
// ─────────────────────────────────────────────────────────────
describe("GET/PUT /api/system-settings", () => {
  it("SUPER_ADMIN reads defaults when nothing is stored", async () => {
    const res = await request(app)
      .get("/api/system-settings")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.settings.feedbackFormLink).toBe("");
  });

  it("SUPER_ADMIN updates the feedback form link and it persists", async () => {
    const put = await request(app)
      .put("/api/system-settings")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ feedbackFormLink: "https://forms.example.com/feedback" });

    expect(put.status).toBe(200);
    expect(put.body.data.settings.feedbackFormLink).toBe("https://forms.example.com/feedback");

    const get = await request(app)
      .get("/api/system-settings")
      .set("Authorization", `Bearer ${superAdminToken}`);
    expect(get.body.data.settings.feedbackFormLink).toBe("https://forms.example.com/feedback");
  });

  it("SUPER_ADMIN can clear the link by sending an empty string", async () => {
    await request(app)
      .put("/api/system-settings")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ feedbackFormLink: "https://forms.example.com/feedback" });

    const res = await request(app)
      .put("/api/system-settings")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ feedbackFormLink: "" });

    expect(res.status).toBe(200);
    expect(res.body.data.settings.feedbackFormLink).toBe("");
  });

  it("rejects an invalid (non-URL) feedback link with 400", async () => {
    const res = await request(app)
      .put("/api/system-settings")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ feedbackFormLink: "not-a-url" });

    expect(res.status).toBe(400);
  });

  it("TEAM_ADMIN cannot read system settings (403)", async () => {
    const res = await request(app)
      .get("/api/system-settings")
      .set("Authorization", `Bearer ${teamAdminToken}`);

    expect(res.status).toBe(403);
  });

  it("COACH cannot update system settings (403)", async () => {
    const res = await request(app)
      .put("/api/system-settings")
      .set("Authorization", `Bearer ${coachToken}`)
      .send({ feedbackFormLink: "https://x.example.com" });

    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await request(app).get("/api/system-settings");
    expect(res.status).toBe(401);
  });

  it("returns 405 for an unsupported method on the collection", async () => {
    const res = await request(app)
      .post("/api/system-settings")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({});

    expect(res.status).toBe(405);
  });
});

// ─────────────────────────────────────────────────────────────
// /api/system-settings/booking-questions
// ─────────────────────────────────────────────────────────────
describe("Default booking questions", () => {
  const create = (token: string, text: string) =>
    request(app)
      .post("/api/system-settings/booking-questions")
      .set("Authorization", `Bearer ${token}`)
      .send({ text });

  it("lists an empty set initially", async () => {
    const res = await request(app)
      .get("/api/system-settings/booking-questions")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.questions).toEqual([]);
  });

  it("creates a question with order 0 and increments order for the next", async () => {
    const first = await create(superAdminToken, "What is your goal?");
    expect(first.status).toBe(201);
    expect(first.body.data.question).toMatchObject({ text: "What is your goal?", order: 0 });

    const second = await create(superAdminToken, "Any prior experience?");
    expect(second.body.data.question.order).toBe(1);
  });

  it("strips HTML from the question text", async () => {
    const res = await create(superAdminToken, "<b>Plain</b> <i>text</i> only");
    expect(res.status).toBe(201);
    expect(res.body.data.question.text).toBe("Plain text only");
  });

  it("rejects empty question text with 400", async () => {
    const res = await create(superAdminToken, "   ");
    expect(res.status).toBe(400);
  });

  it("rejects creating more than the 5-question maximum (422)", async () => {
    for (let i = 0; i < 5; i++) {
      const ok = await create(superAdminToken, `Question ${i}`);
      expect(ok.status).toBe(201);
    }
    const sixth = await create(superAdminToken, "One too many");
    expect(sixth.status).toBe(422);
  });

  it("updates a question's text", async () => {
    const created = await create(superAdminToken, "Original");
    const id = created.body.data.question.id;

    const res = await request(app)
      .put(`/api/system-settings/booking-questions/${id}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ text: "Updated" });

    expect(res.status).toBe(200);
    expect(res.body.data.question.text).toBe("Updated");
  });

  it("returns 400 for a non-UUID id", async () => {
    const res = await request(app)
      .put("/api/system-settings/booking-questions/not-a-uuid")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ text: "x" });

    expect(res.status).toBe(400);
  });

  it("returns 404 when updating a non-existent question", async () => {
    const res = await request(app)
      .put("/api/system-settings/booking-questions/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ text: "x" });

    expect(res.status).toBe(404);
  });

  it("deletes a question and compacts the remaining order values", async () => {
    const a = await create(superAdminToken, "A"); // order 0
    await create(superAdminToken, "B"); // order 1
    await create(superAdminToken, "C"); // order 2

    const del = await request(app)
      .delete(`/api/system-settings/booking-questions/${a.body.data.question.id}`)
      .set("Authorization", `Bearer ${superAdminToken}`);
    expect(del.status).toBe(200);

    const list = await request(app)
      .get("/api/system-settings/booking-questions")
      .set("Authorization", `Bearer ${superAdminToken}`);

    const questions = list.body.data.questions as Array<{ text: string; order: number }>;
    expect(questions.map((q) => q.text)).toEqual(["B", "C"]);
    expect(questions.map((q) => q.order)).toEqual([0, 1]); // compacted, no gap left by A
  });

  it("returns 404 when deleting a non-existent question", async () => {
    const res = await request(app)
      .delete("/api/system-settings/booking-questions/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(404);
  });

  it("TEAM_ADMIN cannot create a default question (403)", async () => {
    const res = await create(teamAdminToken, "Nope");
    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await request(app).get("/api/system-settings/booking-questions");
    expect(res.status).toBe(401);
  });
});
