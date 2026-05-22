import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/shared/db/prisma";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";

type TestContext = {
  superAdminToken: string;
  teamAdminToken: string;
  teamAdminId: string;
  otherTeamAdminToken: string;
  coachToken: string;
  teamId: string;
  otherTeamId: string;
  eventTypeId: string;
};

let context: TestContext;

const uniqueValue = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createGroup = async (
  teamId: string,
  token: string,
  payload: Record<string, unknown> = {},
) =>
  request(app)
    .post(`/api/teams/${teamId}/event-groups`)
    .set("Authorization", `Bearer ${token}`)
    .send({ name: uniqueValue("Group"), ...payload });

const createEvent = async (
  teamId: string,
  token: string,
  eventTypeId: string,
  payload: Record<string, unknown> = {},
) =>
  request(app)
    .post(`/api/teams/${teamId}/events`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: uniqueValue("Event"),
      description: "Event for group tests",
      eventTypeId,
      interactionType: "ONE_TO_ONE",
      assignmentStrategy: "DIRECT",
      durationSeconds: 1800,
      locationType: "VIRTUAL",
      locationValue: "https://meet.example.com/session",
      isActive: true,
      ...payload,
    });

beforeAll(async () => {
  await clearTables();

  const superAdmin = await bootstrapAdmin("super@event-groups.com", "Admin1234");
  const teamAdmin = await registerUser(superAdmin.token, {
    firstName: "Team",
    lastName: "Admin",
    email: "teamadmin-groups@example.com",
    password: "TeamAdmin1234",
    role: "TEAM_ADMIN",
  });
  const otherTeamAdmin = await registerUser(superAdmin.token, {
    firstName: "Other",
    lastName: "Admin",
    email: "other-teamadmin-groups@example.com",
    password: "TeamAdmin1234",
    role: "TEAM_ADMIN",
  });
  const coach = await registerUser(superAdmin.token, {
    firstName: "Coach",
    lastName: "Only",
    email: "coach-groups@example.com",
    password: "Coach1234",
    role: "COACH",
  });

  const teamRes = await request(app)
    .post("/api/teams")
    .set("Authorization", `Bearer ${superAdmin.token}`)
    .send({
      name: "Groups Team A",
      description: "Primary team",
      teamLeadId: teamAdmin.id,
    });
  const otherTeamRes = await request(app)
    .post("/api/teams")
    .set("Authorization", `Bearer ${superAdmin.token}`)
    .send({
      name: "Groups Team B",
      description: "Other team",
      teamLeadId: otherTeamAdmin.id,
    });

  const eventTypeRes = await request(app)
    .post("/api/event-types")
    .set("Authorization", `Bearer ${superAdmin.token}`)
    .send({
      key: uniqueValue("group-event-type"),
      name: "Group Event Type",
      isActive: true,
    });

  context = {
    superAdminToken: superAdmin.token,
    teamAdminToken: teamAdmin.token,
    teamAdminId: teamAdmin.id,
    otherTeamAdminToken: otherTeamAdmin.token,
    coachToken: coach.token,
    teamId: teamRes.body.data.id,
    otherTeamId: otherTeamRes.body.data.id,
    eventTypeId: eventTypeRes.body.data.id,
  };
});

afterAll(clearTables);

describe("Event group CRUD", () => {
  it("creates an event group with a name and description", async () => {
    const res = await createGroup(context.teamId, context.teamAdminToken, {
      name: uniqueValue("Mentorship"),
      description: "Mentorship sessions",
      color: "#3b82f6",
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      teamId: context.teamId,
      description: "Mentorship sessions",
      color: "#3b82f6",
    });
    expect(res.body.data._count.events).toBe(0);
  });

  it("lists event groups for a team sorted alphabetically", async () => {
    const teamRes = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${context.superAdminToken}`)
      .send({
        name: uniqueValue("Sort Team"),
        description: "Sort scoped team",
        teamLeadId: context.teamAdminId,
      });
    const sortTeamId = teamRes.body.data.id;

    await createGroup(sortTeamId, context.teamAdminToken, { name: "Zeta" });
    await createGroup(sortTeamId, context.teamAdminToken, { name: "Alpha" });

    const res = await request(app)
      .get(`/api/teams/${sortTeamId}/event-groups`)
      .set("Authorization", `Bearer ${context.superAdminToken}`);

    expect(res.status).toBe(200);
    const names = res.body.data.groups.map((g: { name: string }) => g.name);
    expect(names).toEqual(["Alpha", "Zeta"]);
  });

  it("rejects duplicate group names within the same team", async () => {
    const name = uniqueValue("Live Assessments");
    const first = await createGroup(context.teamId, context.teamAdminToken, { name });
    expect(first.status).toBe(201);

    const dup = await createGroup(context.teamId, context.teamAdminToken, { name });
    expect(dup.status).toBe(409);
  });

  it("allows the same group name in different teams", async () => {
    const name = uniqueValue("Shared Name");
    const a = await createGroup(context.teamId, context.teamAdminToken, { name });
    const b = await createGroup(context.otherTeamId, context.otherTeamAdminToken, { name });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
  });

  it("updates a group's name, description, and color", async () => {
    const created = await createGroup(context.teamId, context.teamAdminToken);
    const groupId = created.body.data.id;
    const newName = uniqueValue("Renamed");

    const res = await request(app)
      .patch(`/api/event-groups/${groupId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ name: newName, description: "Updated", color: "#10b981" });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: groupId,
      name: newName,
      description: "Updated",
      color: "#10b981",
    });
  });

  it("blocks deletion of a group that contains events", async () => {
    const created = await createGroup(context.teamId, context.teamAdminToken);
    const groupId = created.body.data.id;

    const event = await createEvent(context.teamId, context.teamAdminToken, context.eventTypeId, {
      groupId,
    });
    expect(event.status).toBe(201);

    const del = await request(app)
      .delete(`/api/event-groups/${groupId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);
    expect(del.status).toBe(409);

    // Move the event out (unassign)
    const unassign = await request(app)
      .patch(`/api/events/${event.body.data.id}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ interactionType: "ONE_TO_ONE", groupId: null });
    expect(unassign.status).toBe(200);

    const retry = await request(app)
      .delete(`/api/event-groups/${groupId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);
    expect(retry.status).toBe(200);
  });

  it("rejects non-admin callers", async () => {
    const groupRes = await createGroup(context.teamId, context.coachToken);
    expect(groupRes.status).toBe(403);
  });

  it("rejects cross-team team-admins on create and delete", async () => {
    const created = await createGroup(context.teamId, context.teamAdminToken);
    const groupId = created.body.data.id;

    const otherCreate = await createGroup(context.teamId, context.otherTeamAdminToken);
    expect(otherCreate.status).toBe(403);

    const otherDelete = await request(app)
      .delete(`/api/event-groups/${groupId}`)
      .set("Authorization", `Bearer ${context.otherTeamAdminToken}`);
    expect(otherDelete.status).toBe(403);
  });
});

describe("Event group assignment on events", () => {
  it("creates an event with a valid groupId from the same team", async () => {
    const created = await createGroup(context.teamId, context.teamAdminToken);
    const groupId = created.body.data.id;

    const event = await createEvent(context.teamId, context.teamAdminToken, context.eventTypeId, {
      groupId,
    });
    expect(event.status).toBe(201);
    expect(event.body.data.groupId).toBe(groupId);
    expect(event.body.data.group).toMatchObject({ id: groupId });
  });

  it("rejects creating an event with a group belonging to a different team", async () => {
    const otherTeamGroup = await createGroup(
      context.otherTeamId,
      context.otherTeamAdminToken,
    );
    const otherGroupId = otherTeamGroup.body.data.id;

    const event = await createEvent(context.teamId, context.teamAdminToken, context.eventTypeId, {
      groupId: otherGroupId,
    });

    expect(event.status).toBe(400);
  });

  it("moves an event between groups via PATCH", async () => {
    const groupA = (await createGroup(context.teamId, context.teamAdminToken)).body.data.id;
    const groupB = (await createGroup(context.teamId, context.teamAdminToken)).body.data.id;

    const event = await createEvent(context.teamId, context.teamAdminToken, context.eventTypeId, {
      groupId: groupA,
    });
    expect(event.body.data.group.id).toBe(groupA);

    const moved = await request(app)
      .patch(`/api/events/${event.body.data.id}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ interactionType: "ONE_TO_ONE", groupId: groupB });
    expect(moved.status).toBe(200);
    expect(moved.body.data.group.id).toBe(groupB);

    const groupADb = await prisma.eventGroup.findUnique({
      where: { id: groupA },
      include: { _count: { select: { events: true } } },
    });
    expect(groupADb?._count.events).toBe(0);
  });

  it("unassigns an event by sending groupId: null", async () => {
    const groupId = (await createGroup(context.teamId, context.teamAdminToken)).body.data.id;

    const event = await createEvent(context.teamId, context.teamAdminToken, context.eventTypeId, {
      groupId,
    });
    expect(event.body.data.group.id).toBe(groupId);

    const cleared = await request(app)
      .patch(`/api/events/${event.body.data.id}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ interactionType: "ONE_TO_ONE", groupId: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.data.group).toBeNull();
  });
});
