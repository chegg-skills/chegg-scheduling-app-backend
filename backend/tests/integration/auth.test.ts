import request from "supertest";
import app from "../../src/app";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";

const BOOTSTRAP_SECRET = process.env.BOOTSTRAP_SECRET ?? "test-bootstrap-secret-abc123";

afterAll(clearTables);

// ─────────────────────────────────────────────────────────────
// POST /api/auth/bootstrap
// ─────────────────────────────────────────────────────────────
describe("POST /api/auth/bootstrap", () => {
  // Each test must start with an empty database
  beforeEach(clearTables);

  it("creates a SUPER_ADMIN when the database is empty", async () => {
    const res = await request(app).post("/api/auth/bootstrap").send({
      bootstrapSecret: BOOTSTRAP_SECRET,
      firstName: "First",
      lastName: "Admin",
      email: "bootstrap@test.com",
      password: "Admin1234",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe("SUPER_ADMIN");
    expect(typeof res.body.data.token).toBe("string");
    // password must never be returned
    expect(res.body.data.user.password).toBeUndefined();
  });

  it("returns 403 when a user already exists", async () => {
    // seed one user first
    await request(app).post("/api/auth/bootstrap").send({
      bootstrapSecret: BOOTSTRAP_SECRET,
      firstName: "First",
      lastName: "Admin",
      email: "first@test.com",
      password: "Admin1234",
    });

    const res = await request(app).post("/api/auth/bootstrap").send({
      bootstrapSecret: BOOTSTRAP_SECRET,
      firstName: "Second",
      lastName: "Admin",
      email: "second@test.com",
      password: "Admin1234",
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("returns 403 when the bootstrap secret is wrong", async () => {
    const res = await request(app).post("/api/auth/bootstrap").send({
      bootstrapSecret: "totally-wrong-secret",
      firstName: "Hacker",
      lastName: "User",
      email: "hacker@test.com",
      password: "Admin1234",
    });

    expect(res.status).toBe(403);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app).post("/api/auth/bootstrap").send({
      bootstrapSecret: BOOTSTRAP_SECRET,
      // missing firstName, lastName, email, password
    });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────
describe("POST /api/auth/login", () => {
  const loginEmail = "loginuser@test.com";
  const loginPassword = "LoginUser1234";

  beforeAll(async () => {
    await clearTables();
    await bootstrapAdmin(loginEmail, loginPassword);
  });

  it("returns 200 with a JWT and safe user on valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: loginEmail, password: loginPassword });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.token).toBe("string");
    expect(res.body.data.user.email).toBe(loginEmail);
    expect(res.body.data.user.role).toBe("SUPER_ADMIN");
    expect(res.body.data.user.password).toBeUndefined();
  });

  it("returns 401 for a wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: loginEmail, password: "WrongPassword999" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 for an unknown email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@nowhere.com", password: "SomePass123" });

    expect(res.status).toBe(401);
  });

  it("returns 400 when email is missing", async () => {
    const res = await request(app).post("/api/auth/login").send({ password: "SomePass123" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: loginEmail });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────
describe("POST /api/auth/register", () => {
  let adminToken: string;
  let coachToken: string;

  beforeAll(async () => {
    await clearTables();
    const admin = await bootstrapAdmin("admin@register.com", "Admin1234");
    adminToken = admin.token;

    const coach = await registerUser(adminToken, {
      firstName: "Existing",
      lastName: "Coach",
      email: "coach@register.com",
      password: "Coach1234",
      role: "COACH",
    });
    coachToken = coach.token;
  });

  it("SUPER_ADMIN can register a new COACH", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        firstName: "New",
        lastName: "Coach",
        email: "newcoach@register.com",
        password: "Coach1234",
        role: "COACH",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("COACH");
    expect(res.body.data.user.password).toBeUndefined();
  });

  it("SUPER_ADMIN can register a TEAM_ADMIN", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        firstName: "New",
        lastName: "TeamAdmin",
        email: "newteamadmin@register.com",
        password: "TeamAdmin1234",
        role: "TEAM_ADMIN",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("TEAM_ADMIN");
  });

  it("returns 401 when no auth token is provided", async () => {
    const res = await request(app).post("/api/auth/register").send({
      firstName: "Ghost",
      lastName: "User",
      email: "ghost@register.com",
      password: "Ghost1234",
    });

    expect(res.status).toBe(401);
  });

  it("COACH cannot register users (403)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${coachToken}`)
      .send({
        firstName: "Anyone",
        lastName: "User",
        email: "anyone@register.com",
        password: "Anyone1234",
        role: "COACH",
      });

    expect(res.status).toBe(403);
  });

  it("returns 409 when the email is already registered", async () => {
    await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        firstName: "Dup",
        lastName: "User",
        email: "dup@register.com",
        password: "Dup12345",
        role: "COACH",
      });

    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        firstName: "Dup",
        lastName: "Again",
        email: "dup@register.com",
        password: "Dup12345",
        role: "COACH",
      });

    expect(res.status).toBe(409);
  });

  it("returns 400 when the password is shorter than 8 characters", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        firstName: "Short",
        lastName: "Pass",
        email: "shortpass@register.com",
        password: "abc",
        role: "COACH",
      });

    expect(res.status).toBe(400);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ email: "incomplete@register.com" });

    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid role value", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        firstName: "Bad",
        lastName: "Role",
        email: "badrole@register.com",
        password: "BadRole1234",
        role: "INVALID_ROLE",
      });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────
describe("POST /api/auth/logout", () => {
  let token: string;

  beforeAll(async () => {
    await clearTables();
    const admin = await bootstrapAdmin("logout@test.com", "Admin1234");
    token = admin.token;
  });

  it("returns 200 when an authenticated user logs out", async () => {
    const res = await request(app).post("/api/auth/logout").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 401 when no auth token is provided", async () => {
    const res = await request(app).post("/api/auth/logout");

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
// Error handling — method not allowed & path not found
// ─────────────────────────────────────────────────────────────
describe("Error handling", () => {
  it("returns 405 for an unsupported HTTP method on a known route", async () => {
    const res = await request(app).get("/api/auth/login");

    expect(res.status).toBe(405);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 for an unknown API path", async () => {
    const res = await request(app).get("/api/totally-nonexistent-path");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
