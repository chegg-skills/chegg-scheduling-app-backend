import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/shared/db/prisma";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";

type TestContext = {
  superAdminToken: string;
  superAdminId: string;
  teamAdminToken: string;
  teamAdminId: string;
  otherTeamAdminToken: string;
  otherTeamAdminId: string;
  coachOneId: string;
  coachTwoId: string;
  coachToken: string;
  teamId: string;
  otherTeamId: string;
};

let context: TestContext;

const uniqueValue = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createOffering = async (token: string, payload?: Record<string, unknown>) => {
  const res = await request(app)
    .post("/api/event-offerings")
    .set("Authorization", `Bearer ${token}`)
    .send({
      key: uniqueValue("resume-review"),
      name: uniqueValue("Resume Review"),
      description: "Catalog offering",
      sortOrder: 1,
      isActive: true,
      ...payload,
    });

  return res;
};

const createInteractionType = async (
  token: string,
  payload?: Record<string, unknown>,
) => {
  const res = await request(app)
    .post("/api/event-interaction-types")
    .set("Authorization", `Bearer ${token}`)
    .send({
      key: uniqueValue("one-to-one"),
      name: uniqueValue("One-to-One"),
      description: "Interaction type",
      supportsRoundRobin: false,
      supportsMultipleHosts: false,
      minHosts: 1,
      maxHosts: 1,
      minParticipants: 1,
      maxParticipants: 1,
      sortOrder: 1,
      isActive: true,
      ...payload,
    });

  return res;
};

const createEvent = async (
  teamId: string,
  token: string,
  payload: Record<string, unknown>,
) => {
  return request(app)
    .post(`/api/teams/${teamId}/events`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: uniqueValue("Event"),
      description: "Event description",
      assignmentStrategy: "DIRECT",
      durationSeconds: 1800,
      locationType: "VIRTUAL",
      locationValue: "https://meet.example.com/session",
      isActive: true,
      ...payload,
    });
};

beforeAll(async () => {
  await clearTables();

  const superAdmin = await bootstrapAdmin("super@events.com", "Admin1234");
  const teamAdmin = await registerUser(superAdmin.token, {
    firstName: "Team",
    lastName: "Admin",
    email: "teamadmin-events@example.com",
    password: "TeamAdmin1234",
    role: "TEAM_ADMIN",
  });
  const otherTeamAdmin = await registerUser(superAdmin.token, {
    firstName: "Other",
    lastName: "Admin",
    email: "other-teamadmin-events@example.com",
    password: "TeamAdmin1234",
    role: "TEAM_ADMIN",
  });
  const coachOne = await registerUser(superAdmin.token, {
    firstName: "Coach",
    lastName: "One",
    email: "coach-one-events@example.com",
    password: "Coach1234",
    role: "COACH",
  });
  const coachTwo = await registerUser(superAdmin.token, {
    firstName: "Coach",
    lastName: "Two",
    email: "coach-two-events@example.com",
    password: "Coach1234",
    role: "COACH",
  });

  const teamRes = await request(app)
    .post("/api/teams")
    .set("Authorization", `Bearer ${superAdmin.token}`)
    .send({
      name: "Primary Events Team",
      description: "Team for event tests",
      teamLeadId: teamAdmin.id,
    });

  const otherTeamRes = await request(app)
    .post("/api/teams")
    .set("Authorization", `Bearer ${superAdmin.token}`)
    .send({
      name: "Secondary Events Team",
      description: "Other team for auth tests",
      teamLeadId: otherTeamAdmin.id,
    });

  const teamId = teamRes.body.data.id as string;
  const otherTeamId = otherTeamRes.body.data.id as string;

  await prisma.teamMember.createMany({
    data: [
      { teamId, userId: coachOne.id },
      { teamId, userId: coachTwo.id },
      { teamId, userId: teamAdmin.id },
      { teamId: otherTeamId, userId: otherTeamAdmin.id },
    ],
  });

  context = {
    superAdminToken: superAdmin.token,
    superAdminId: superAdmin.id,
    teamAdminToken: teamAdmin.token,
    teamAdminId: teamAdmin.id,
    otherTeamAdminToken: otherTeamAdmin.token,
    otherTeamAdminId: otherTeamAdmin.id,
    coachOneId: coachOne.id,
    coachTwoId: coachTwo.id,
    coachToken: coachOne.token,
    teamId,
    otherTeamId,
  };
});

afterAll(clearTables);

describe("Event offerings routes", () => {
  it("creates an event offering and normalizes the key", async () => {
    const res = await createOffering(context.superAdminToken, {
      key: "  Resume Review Offering  ",
      name: "Resume Review Offering",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.key).toBe("resume_review_offering");
    expect(res.body.data.name).toBe("Resume Review Offering");
  });

  it("lists event offerings", async () => {
    const created = await createOffering(context.superAdminToken);

    const res = await request(app)
      .get("/api/event-offerings")
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.offerings)).toBe(true);
    expect(
      res.body.data.offerings.some(
        (offering: { id: string }) => offering.id === created.body.data.id,
      ),
    ).toBe(true);
  });

  it("updates an event offering", async () => {
    const created = await createOffering(context.superAdminToken, {
      key: uniqueValue("offering"),
      name: "Original Offering",
    });

    const res = await request(app)
      .patch(`/api/event-offerings/${created.body.data.id}`)
      .set("Authorization", `Bearer ${context.superAdminToken}`)
      .send({
        name: "Updated Offering",
        description: "Updated description",
        sortOrder: 5,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Updated Offering");
    expect(res.body.data.description).toBe("Updated description");
    expect(res.body.data.sortOrder).toBe(5);
  });

  it("rejects event offering creation for a COACH", async () => {
    const res = await createOffering(context.coachToken);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe("Interaction type routes", () => {
  it("creates a valid interaction type", async () => {
    const res = await createInteractionType(context.superAdminToken, {
      key: "live-qna",
      name: "Live Q&A",
      supportsRoundRobin: true,
      supportsMultipleHosts: true,
      minHosts: 2,
      maxHosts: 4,
      maxParticipants: 20,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.supportsRoundRobin).toBe(true);
    expect(res.body.data.supportsMultipleHosts).toBe(true);
  });

  it("rejects invalid round robin interaction types", async () => {
    const res = await createInteractionType(context.superAdminToken, {
      key: "bad-round-robin",
      name: "Bad Round Robin",
      supportsRoundRobin: true,
      supportsMultipleHosts: false,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/supportsRoundRobin requires supportsMultipleHosts/i);
  });

  it("lists interaction types", async () => {
    const created = await createInteractionType(context.superAdminToken);

    const res = await request(app)
      .get("/api/event-interaction-types")
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.interactionTypes)).toBe(true);
    expect(
      res.body.data.interactionTypes.some(
        (interactionType: { id: string }) => interactionType.id === created.body.data.id,
      ),
    ).toBe(true);
  });

  it("updates an interaction type", async () => {
    const created = await createInteractionType(context.superAdminToken, {
      key: uniqueValue("mentorship"),
      name: "Mentorship",
      supportsMultipleHosts: true,
      maxHosts: 2,
    });

    const res = await request(app)
      .patch(`/api/event-interaction-types/${created.body.data.id}`)
      .set("Authorization", `Bearer ${context.superAdminToken}`)
      .send({
        name: "Updated Mentorship",
        maxParticipants: 4,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Updated Mentorship");
    expect(res.body.data.maxParticipants).toBe(4);
  });
});

describe("Event CRUD routes", () => {
  it("creates a team event", async () => {
    const offering = await createOffering(context.superAdminToken, {
      key: uniqueValue("career-coaching"),
      name: "Career Coaching",
    });
    const interactionType = await createInteractionType(context.superAdminToken, {
      key: uniqueValue("one-on-one"),
      name: "One-to-One",
    });

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Career Coaching Session",
      offeringId: offering.body.data.id,
      interactionTypeId: interactionType.body.data.id,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Career Coaching Session");
    expect(res.body.data.offering.id).toBe(offering.body.data.id);
    expect(res.body.data.interactionType.id).toBe(interactionType.body.data.id);
  });

  it("forbids a TEAM_ADMIN from managing another team", async () => {
    const offering = await createOffering(context.superAdminToken);
    const interactionType = await createInteractionType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.otherTeamAdminToken, {
      name: "Unauthorized Event",
      offeringId: offering.body.data.id,
      interactionTypeId: interactionType.body.data.id,
    });

    expect(res.status).toBe(403);
  });

  it("lists team events with pagination", async () => {
    const offering = await createOffering(context.superAdminToken, {
      key: uniqueValue("list-offering"),
      name: "List Offering",
    });
    const interactionType = await createInteractionType(context.superAdminToken, {
      key: uniqueValue("list-interaction"),
      name: "List Interaction",
    });
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Listable Event",
      offeringId: offering.body.data.id,
      interactionTypeId: interactionType.body.data.id,
    });

    const res = await request(app)
      .get(`/api/teams/${context.teamId}/events?page=1&pageSize=10`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.events)).toBe(true);
    expect(res.body.data.pagination).toMatchObject({
      page: 1,
      pageSize: 10,
      total: expect.any(Number),
      totalPages: expect.any(Number),
    });
    expect(
      res.body.data.events.some(
        (event: { id: string }) => event.id === created.body.data.id,
      ),
    ).toBe(true);
  });

  it("reads and updates a specific event", async () => {
    const offering = await createOffering(context.superAdminToken, {
      key: uniqueValue("read-offering"),
      name: "Read Offering",
    });
    const interactionType = await createInteractionType(context.superAdminToken, {
      key: uniqueValue("read-interaction"),
      name: "Read Interaction",
    });
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Readable Event",
      offeringId: offering.body.data.id,
      interactionTypeId: interactionType.body.data.id,
    });
    const eventId = created.body.data.id as string;

    const readRes = await request(app)
      .get(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(readRes.status).toBe(200);
    expect(readRes.body.data.id).toBe(eventId);

    const updateRes = await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        name: "Updated Event Name",
        description: "Updated event description",
        locationValue: "https://meet.example.com/updated",
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.name).toBe("Updated Event Name");
    expect(updateRes.body.data.description).toBe("Updated event description");
    expect(updateRes.body.data.locationValue).toBe("https://meet.example.com/updated");
  });

  it("deactivates an event", async () => {
    const offering = await createOffering(context.superAdminToken, {
      key: uniqueValue("delete-offering"),
      name: "Delete Offering",
    });
    const interactionType = await createInteractionType(context.superAdminToken, {
      key: uniqueValue("delete-interaction"),
      name: "Delete Interaction",
    });
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Deletable Event",
      offeringId: offering.body.data.id,
      interactionTypeId: interactionType.body.data.id,
    });

    const res = await request(app)
      .delete(`/api/events/${created.body.data.id}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });
});

describe("Event host routes", () => {
  it("assigns and lists a single host for a one-to-one event", async () => {
    const offering = await createOffering(context.superAdminToken, {
      key: uniqueValue("host-offering"),
      name: "Host Offering",
    });
    const interactionType = await createInteractionType(context.superAdminToken, {
      key: uniqueValue("host-interaction"),
      name: "Host Interaction",
    });
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Hosted Event",
      offeringId: offering.body.data.id,
      interactionTypeId: interactionType.body.data.id,
    });
    const eventId = event.body.data.id as string;

    const updateHostsRes = await request(app)
      .put(`/api/events/${eventId}/hosts`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        hosts: [{ userId: context.coachOneId, hostOrder: 1 }],
      });

    expect(updateHostsRes.status).toBe(200);
    expect(updateHostsRes.body.data.hosts).toHaveLength(1);
    expect(updateHostsRes.body.data.hosts[0].hostUserId).toBe(context.coachOneId);

    const listHostsRes = await request(app)
      .get(`/api/events/${eventId}/hosts`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(listHostsRes.status).toBe(200);
    expect(listHostsRes.body.data.hosts).toHaveLength(1);
  });

  it("rejects assigning too few hosts for a round-robin event", async () => {
    const offering = await createOffering(context.superAdminToken, {
      key: uniqueValue("rr-offering"),
      name: "Round Robin Offering",
    });
    const interactionType = await createInteractionType(context.superAdminToken, {
      key: uniqueValue("rr-interaction"),
      name: "Round Robin",
      supportsRoundRobin: true,
      supportsMultipleHosts: true,
      minHosts: 2,
      maxHosts: 4,
      maxParticipants: 10,
    });
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Round Robin Event",
      offeringId: offering.body.data.id,
      interactionTypeId: interactionType.body.data.id,
      assignmentStrategy: "ROUND_ROBIN",
    });

    const res = await request(app)
      .put(`/api/events/${event.body.data.id}/hosts`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        hosts: [{ userId: context.coachOneId, hostOrder: 1 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/ROUND_ROBIN events require at least two hosts/i);
  });

  it("removes an assigned host", async () => {
    const offering = await createOffering(context.superAdminToken, {
      key: uniqueValue("remove-host-offering"),
      name: "Remove Host Offering",
    });
    const interactionType = await createInteractionType(context.superAdminToken, {
      key: uniqueValue("remove-host-interaction"),
      name: "Remove Host Interaction",
    });
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Host Removal Event",
      offeringId: offering.body.data.id,
      interactionTypeId: interactionType.body.data.id,
    });
    const eventId = event.body.data.id as string;

    await request(app)
      .put(`/api/events/${eventId}/hosts`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        hosts: [{ userId: context.coachOneId, hostOrder: 1 }],
      });

    const res = await request(app)
      .delete(`/api/events/${eventId}/hosts/${context.coachOneId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.hosts).toHaveLength(0);
  });
});