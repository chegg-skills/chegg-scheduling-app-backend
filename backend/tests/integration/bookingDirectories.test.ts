import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/shared/db/prisma";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";

const NON_EXISTENT_UUID = "00000000-0000-0000-0000-000000000000";

let superAdminToken: string;
let teamAdminToken: string;
let teamId: string;
let activeEventTypeId: string;
let inactiveEventTypeId: string;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

// clearTables() doesn't wipe the booking-directory tables; isolate them per test.
const clearDirectories = async () => {
  await prisma.bookingDirectoryTeam.deleteMany();
  await prisma.bookingDirectorySection.deleteMany();
  await prisma.bookingDirectory.deleteMany();
};

const createDirectory = (slug: string, name = "Directory") =>
  request(app).post("/api/booking-directories").set(auth(superAdminToken)).send({ slug, name });

beforeAll(async () => {
  await clearTables();
  await clearDirectories();

  const admin = await bootstrapAdmin("super@dir.com", "Admin1234");
  superAdminToken = admin.token;

  const teamAdmin = await registerUser(superAdminToken, {
    firstName: "Team",
    lastName: "Admin",
    email: "teamadmin@dir.com",
    password: "TeamAdmin1234",
    role: "TEAM_ADMIN",
  });
  teamAdminToken = teamAdmin.token;

  const team = await prisma.team.create({
    data: {
      name: "Directory Team",
      teamLeadId: teamAdmin.id,
      createdById: admin.id,
      isActive: true,
      publicBookingSlug: "directory-team",
    },
  });
  teamId = team.id;

  const activeType = await prisma.eventType.create({
    data: { key: "dir_active", name: "Active Type", isActive: true, createdById: admin.id, updatedById: admin.id },
  });
  activeEventTypeId = activeType.id;

  const inactiveType = await prisma.eventType.create({
    data: { key: "dir_inactive", name: "Inactive Type", isActive: false, createdById: admin.id, updatedById: admin.id },
  });
  inactiveEventTypeId = inactiveType.id;
});

beforeEach(clearDirectories);

afterAll(async () => {
  await clearDirectories();
  await clearTables();
});

// ─────────────────────────────────────────────────────────────
// Directory CRUD
// ─────────────────────────────────────────────────────────────
describe("Booking directory CRUD", () => {
  it("SUPER_ADMIN creates a directory", async () => {
    const res = await createDirectory("eng-dir", "Engineering");
    expect(res.status).toBe(201);
    expect(res.body.data.bookingDirectory).toMatchObject({ slug: "eng-dir", name: "Engineering" });
    expect(res.body.data.bookingDirectory.sections).toEqual([]);
  });

  it("rejects a duplicate slug with 409", async () => {
    await createDirectory("dup-dir");
    const res = await createDirectory("dup-dir");
    expect(res.status).toBe(409);
  });

  it("rejects an invalid slug with 400", async () => {
    const res = await request(app)
      .post("/api/booking-directories")
      .set(auth(superAdminToken))
      .send({ slug: "Not A Slug", name: "X" });
    expect(res.status).toBe(400);
  });

  it("lists directories", async () => {
    await createDirectory("list-a");
    await createDirectory("list-b");
    const res = await request(app).get("/api/booking-directories").set(auth(superAdminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.bookingDirectories).toHaveLength(2);
  });

  it("gets a directory by id", async () => {
    const created = await createDirectory("get-dir");
    const id = created.body.data.bookingDirectory.id;
    const res = await request(app).get(`/api/booking-directories/${id}`).set(auth(superAdminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.bookingDirectory.id).toBe(id);
  });

  it("returns 404 for a non-existent directory and 400 for a malformed id", async () => {
    const missing = await request(app)
      .get(`/api/booking-directories/${NON_EXISTENT_UUID}`)
      .set(auth(superAdminToken));
    expect(missing.status).toBe(404);

    const malformed = await request(app)
      .get("/api/booking-directories/not-a-uuid")
      .set(auth(superAdminToken));
    expect(malformed.status).toBe(400);
  });

  it("updates a directory's name and active flag", async () => {
    const created = await createDirectory("upd-dir", "Before");
    const id = created.body.data.bookingDirectory.id;

    const res = await request(app)
      .patch(`/api/booking-directories/${id}`)
      .set(auth(superAdminToken))
      .send({ name: "After", isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.data.bookingDirectory).toMatchObject({ name: "After", isActive: false });
  });

  it("returns 404 when updating a non-existent directory", async () => {
    const res = await request(app)
      .patch(`/api/booking-directories/${NON_EXISTENT_UUID}`)
      .set(auth(superAdminToken))
      .send({ name: "X" });
    expect(res.status).toBe(404);
  });

  it("deletes a directory (204) and 404s on a second delete", async () => {
    const created = await createDirectory("del-dir");
    const id = created.body.data.bookingDirectory.id;

    const del = await request(app).delete(`/api/booking-directories/${id}`).set(auth(superAdminToken));
    expect(del.status).toBe(204);

    const again = await request(app).delete(`/api/booking-directories/${id}`).set(auth(superAdminToken));
    expect(again.status).toBe(404);
  });

  it("TEAM_ADMIN cannot create a directory (403)", async () => {
    const res = await request(app)
      .post("/api/booking-directories")
      .set(auth(teamAdminToken))
      .send({ slug: "nope-dir", name: "Nope" });
    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await request(app).get("/api/booking-directories");
    expect(res.status).toBe(401);
  });

  it("returns 405 for an unsupported method on the collection", async () => {
    const res = await request(app).patch("/api/booking-directories").set(auth(superAdminToken));
    expect(res.status).toBe(405);
  });
});

// ─────────────────────────────────────────────────────────────
// Sections
// ─────────────────────────────────────────────────────────────
describe("Booking directory sections", () => {
  const newDirectory = async (slug: string): Promise<string> => {
    const res = await createDirectory(slug);
    return res.body.data.bookingDirectory.id;
  };

  const addSection = (directoryId: string, eventTypeId: string) =>
    request(app)
      .post(`/api/booking-directories/${directoryId}/sections`)
      .set(auth(superAdminToken))
      .send({ eventTypeId });

  it("adds a section for an active event type", async () => {
    const id = await newDirectory("sec-add");
    const res = await addSection(id, activeEventTypeId);
    expect(res.status).toBe(200);
    expect(res.body.data.bookingDirectory.sections).toHaveLength(1);
    expect(res.body.data.bookingDirectory.sections[0].eventType.id).toBe(activeEventTypeId);
  });

  it("rejects a duplicate event type in the same directory (409)", async () => {
    const id = await newDirectory("sec-dup");
    await addSection(id, activeEventTypeId);
    const res = await addSection(id, activeEventTypeId);
    expect(res.status).toBe(409);
  });

  it("rejects an inactive event type (400)", async () => {
    const id = await newDirectory("sec-inactive");
    const res = await addSection(id, inactiveEventTypeId);
    expect(res.status).toBe(400);
  });

  it("returns 404 for a non-existent event type", async () => {
    const id = await newDirectory("sec-missing-type");
    const res = await addSection(id, NON_EXISTENT_UUID);
    expect(res.status).toBe(404);
  });

  it("returns 404 when adding a section to a non-existent directory", async () => {
    const res = await addSection(NON_EXISTENT_UUID, activeEventTypeId);
    expect(res.status).toBe(404);
  });

  it("removes a section", async () => {
    const id = await newDirectory("sec-remove");
    const added = await addSection(id, activeEventTypeId);
    const sectionId = added.body.data.bookingDirectory.sections[0].id;

    const res = await request(app)
      .delete(`/api/booking-directories/${id}/sections/${sectionId}`)
      .set(auth(superAdminToken));

    expect(res.status).toBe(200);
    expect(res.body.data.bookingDirectory.sections).toEqual([]);
  });

  it("returns 404 removing a section that belongs to another directory", async () => {
    const id = await newDirectory("sec-owner");
    const added = await addSection(id, activeEventTypeId);
    const sectionId = added.body.data.bookingDirectory.sections[0].id;

    const other = await newDirectory("sec-other");
    const res = await request(app)
      .delete(`/api/booking-directories/${other}/sections/${sectionId}`)
      .set(auth(superAdminToken));

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────
// Teams within sections
// ─────────────────────────────────────────────────────────────
describe("Teams within directory sections", () => {
  let directoryId: string;
  let sectionId: string;

  beforeEach(async () => {
    const dir = await createDirectory("team-sec");
    directoryId = dir.body.data.bookingDirectory.id;
    const section = await request(app)
      .post(`/api/booking-directories/${directoryId}/sections`)
      .set(auth(superAdminToken))
      .send({ eventTypeId: activeEventTypeId });
    sectionId = section.body.data.bookingDirectory.sections[0].id;
  });

  const addTeam = (secId: string, id: string) =>
    request(app)
      .post(`/api/booking-directories/${directoryId}/sections/${secId}/teams`)
      .set(auth(superAdminToken))
      .send({ teamId: id });

  it("adds a team to a section", async () => {
    const res = await addTeam(sectionId, teamId);
    expect(res.status).toBe(200);
    const section = res.body.data.bookingDirectory.sections[0];
    expect(section.teams).toHaveLength(1);
    expect(section.teams[0].team.id).toBe(teamId);
  });

  it("rejects adding the same team twice (409)", async () => {
    await addTeam(sectionId, teamId);
    const res = await addTeam(sectionId, teamId);
    expect(res.status).toBe(409);
  });

  it("returns 404 for a non-existent team", async () => {
    const res = await addTeam(sectionId, NON_EXISTENT_UUID);
    expect(res.status).toBe(404);
  });

  it("returns 404 when the section does not exist", async () => {
    const res = await addTeam(NON_EXISTENT_UUID, teamId);
    expect(res.status).toBe(404);
  });

  it("removes a team from a section", async () => {
    await addTeam(sectionId, teamId);
    const res = await request(app)
      .delete(`/api/booking-directories/${directoryId}/sections/${sectionId}/teams/${teamId}`)
      .set(auth(superAdminToken));

    expect(res.status).toBe(200);
    expect(res.body.data.bookingDirectory.sections[0].teams).toEqual([]);
  });

  it("returns 404 removing a team that is not in the section", async () => {
    const res = await request(app)
      .delete(`/api/booking-directories/${directoryId}/sections/${sectionId}/teams/${teamId}`)
      .set(auth(superAdminToken));
    expect(res.status).toBe(404);
  });
});
