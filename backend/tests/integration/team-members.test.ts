import request from "supertest";
import app from "../../src/app";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";

type TestContext = {
  superAdminToken: string;
  teamAdminToken: string;
  teamAdminId: string;
  coachId: string;
  coachTwoId: string;
  teamId: string;
};

let context: TestContext;

const uniqueValue = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createOffering = async (token: string) => {
  return request(app)
    .post("/api/event-offerings")
    .set("Authorization", `Bearer ${token}`)
    .send({
      key: uniqueValue("mentoring"),
      name: uniqueValue("Mentoring Offering"),
      description: "Offering for membership tests",
    });
};


beforeAll(async () => {
  await clearTables();

  const superAdmin = await bootstrapAdmin("super@members.com", "Admin1234");
  const teamAdmin = await registerUser(superAdmin.token, {
    firstName: "Team",
    lastName: "Admin",
    email: "teamadmin-members@example.com",
    password: "TeamAdmin1234",
    role: "TEAM_ADMIN",
  });
  const coach = await registerUser(superAdmin.token, {
    firstName: "Coach",
    lastName: "Member",
    email: "coach-members@example.com",
    password: "Coach1234",
    role: "COACH",
  });
  const coachTwo = await registerUser(superAdmin.token, {
    firstName: "Coach",
    lastName: "Two",
    email: "coach-two-members@example.com",
    password: "Coach1234",
    role: "COACH",
  });

  const teamRes = await request(app)
    .post("/api/teams")
    .set("Authorization", `Bearer ${superAdmin.token}`)
    .send({
      name: "Membership Test Team",
      description: "Team member route test team",
      teamLeadId: teamAdmin.id,
    });

  context = {
    superAdminToken: superAdmin.token,
    teamAdminToken: teamAdmin.token,
    teamAdminId: teamAdmin.id,
    coachId: coach.id,
    coachTwoId: coachTwo.id,
    teamId: teamRes.body.data.id as string,
  };
});

afterAll(clearTables);

describe("Team member routes", () => {
  it("adds a team member", async () => {
    const res = await request(app)
      .post(`/api/teams/${context.teamId}/members`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ userId: context.coachId });

    expect(res.status).toBe(201);
    expect(res.body.data.userId).toBe(context.coachId);
    expect(res.body.data.isActive).toBe(true);
  });

  it("lists active team members", async () => {
    await request(app)
      .post(`/api/teams/${context.teamId}/members`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ userId: context.coachTwoId });

    const res = await request(app)
      .get(`/api/teams/${context.teamId}/members`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.members)).toBe(true);
    expect(
      res.body.data.members.some(
        (member: { userId: string }) => member.userId === context.coachTwoId,
      ),
    ).toBe(true);
  });

  it("prevents removing a member assigned to an active team event", async () => {
    await request(app)
      .post(`/api/teams/${context.teamId}/members`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ userId: context.coachId });

    const offering = await createOffering(context.superAdminToken);
    const event = await request(app)
      .post(`/api/teams/${context.teamId}/events`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        name: "Protected Membership Event",
        description: "Event blocking member removal",
        offeringId: offering.body.data.id,
        interactionType: "ONE_TO_ONE",
        assignmentStrategy: "DIRECT",
        durationSeconds: 1800,
        locationType: "VIRTUAL",
        locationValue: "https://meet.example.com/protected-member",
      });

    await request(app)
      .put(`/api/events/${event.body.data.id}/coaches`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        coaches: [{ userId: context.coachId, hostOrder: 1 }],
      });

    const res = await request(app)
      .delete(`/api/teams/${context.teamId}/members/${context.coachId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Remove this user from the team's events/i);
  });

  it("removes an inactive-free team member", async () => {
    await request(app)
      .post(`/api/teams/${context.teamId}/members`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ userId: context.coachTwoId });

    const res = await request(app)
      .delete(`/api/teams/${context.teamId}/members/${context.coachTwoId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.userId).toBe(context.coachTwoId);
    expect(res.body.data.isActive).toBe(false);
  });

  it("prevents removing the Team Lead", async () => {
    const res = await request(app)
      .delete(`/api/teams/${context.teamId}/members/${context.teamAdminId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/Cannot remove the Team Lead/i);
  });

  it("bulk adds multiple team members", async () => {
    const res = await request(app)
      .post(`/api/teams/${context.teamId}/members/bulk`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ userIds: [context.coachId] });

    expect(res.status).toBe(201);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
