import request from "supertest";
import app from "../../src/app";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";
import { prisma } from "../../src/shared/db/prisma";

// teams.test.ts covers delete with an event + booking. This file covers the rest of the
// cascade in team.repository's softDeleteWithChildren: every child table it touches, the
// Event→EventGroup FK ordering, and that a second team's data is left alone.

let superAdminToken: string;
let leadId: string;
let coachId: string;

beforeAll(async () => {
  await clearTables();
  const admin = await bootstrapAdmin("super@cascade.com", "Admin1234");
  superAdminToken = admin.token;
  leadId = (
    await registerUser(superAdminToken, {
      firstName: "Lead",
      lastName: "Admin",
      email: "lead@cascade.com",
      password: "TeamAdmin1234",
      role: "TEAM_ADMIN",
    })
  ).id;
  coachId = (
    await registerUser(superAdminToken, {
      firstName: "A",
      lastName: "Coach",
      email: "coach@cascade.com",
      password: "Coach1234",
      role: "COACH",
    })
  ).id;
});

const seedTeamWithChildren = async (label: string) => {
  const res = await request(app)
    .post("/api/teams")
    .set("Authorization", `Bearer ${superAdminToken}`)
    .send({ name: `${label} team`, teamLeadId: leadId });
  const teamId: string = res.body.data.id;

  const group = await prisma.eventGroup.create({
    data: {
      teamId,
      name: `${label} group`,
      createdById: leadId,
      publicBookingSlug: `${label}-group`,
    },
  });
  const event = await prisma.event.create({
    data: {
      name: `${label} event`,
      teamId,
      groupId: group.id,
      interactionType: "ONE_TO_ONE",
      durationSeconds: 1800,
      locationType: "VIRTUAL",
      locationValue: "https://meet.example.com",
      createdById: leadId,
      updatedById: leadId,
      publicBookingSlug: `${label}-event`,
    },
  });
  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId, userId: coachId } },
    create: { teamId, userId: coachId, isActive: true },
    update: { isActive: true },
  });
  await prisma.eventCoach.create({
    data: { eventId: event.id, coachUserId: coachId, coachOrder: 0 },
  });
  const recurrence = await prisma.recurrenceGroup.create({
    data: { eventId: event.id, frequency: "WEEKLY" },
  });
  await prisma.eventScheduleSlot.create({
    data: {
      eventId: event.id,
      recurrenceGroupId: recurrence.id,
      startTime: new Date(Date.now() + 86400000),
      endTime: new Date(Date.now() + 86400000 + 1800000),
    },
  });
  await prisma.eventRoutingState.create({ data: { eventId: event.id } });
  await prisma.teamNotificationConfig.create({ data: { teamId } });

  return { teamId, eventId: event.id, groupId: group.id };
};

const childCounts = async (teamId: string, eventId: string) => ({
  eventCoaches: await prisma.eventCoach.count({ where: { eventId } }),
  slots: await prisma.eventScheduleSlot.count({ where: { eventId } }),
  recurrenceGroups: await prisma.recurrenceGroup.count({ where: { eventId } }),
  routingStates: await prisma.eventRoutingState.count({ where: { eventId } }),
  eventGroups: await prisma.eventGroup.count({ where: { teamId } }),
  members: await prisma.teamMember.count({ where: { teamId } }),
  notificationConfigs: await prisma.teamNotificationConfig.count({ where: { teamId } }),
});

describe("DELETE /api/teams/:teamId — full cascade", () => {
  it("removes every child, soft-deletes events and the team, and leaves other teams alone", async () => {
    const doomed = await seedTeamWithChildren("doomed");
    const bystander = await seedTeamWithChildren("bystander");

    const before = await childCounts(bystander.teamId, bystander.eventId);
    expect(await childCounts(doomed.teamId, doomed.eventId)).toEqual({
      eventCoaches: 1,
      slots: 1,
      recurrenceGroups: 1,
      routingStates: 1,
      eventGroups: 1,
      members: 2, // team lead + the coach
      notificationConfigs: 1,
    });

    const res = await request(app)
      .delete(`/api/teams/${doomed.teamId}`)
      .set("Authorization", `Bearer ${superAdminToken}`);
    expect(res.status).toBe(200);

    // Children are gone.
    expect(await childCounts(doomed.teamId, doomed.eventId)).toEqual({
      eventCoaches: 0,
      slots: 0,
      recurrenceGroups: 0,
      routingStates: 0,
      eventGroups: 0,
      members: 0,
      notificationConfigs: 0,
    });

    // Event and team are soft-deleted (not removed); the event no longer points at the group.
    const event = await prisma.event.findUnique({ where: { id: doomed.eventId } });
    expect(event).toMatchObject({ isActive: false, groupId: null });
    expect(event!.deletedAt).not.toBeNull();

    const team = await prisma.team.findUnique({ where: { id: doomed.teamId } });
    expect(team).toMatchObject({ isActive: false });
    expect(team!.deletedAt).not.toBeNull();

    // The other team is untouched.
    expect(await childCounts(bystander.teamId, bystander.eventId)).toEqual(before);
    const otherTeam = await prisma.team.findUnique({ where: { id: bystander.teamId } });
    expect(otherTeam!.deletedAt).toBeNull();
    const otherEvent = await prisma.event.findUnique({ where: { id: bystander.eventId } });
    expect(otherEvent).toMatchObject({ isActive: true, groupId: bystander.groupId });
  });

  it("404s on a second delete of the same team (it is already soft-deleted)", async () => {
    const { teamId } = await seedTeamWithChildren("twice");
    const auth = { Authorization: `Bearer ${superAdminToken}` };
    expect((await request(app).delete(`/api/teams/${teamId}`).set(auth)).status).toBe(200);
    expect((await request(app).delete(`/api/teams/${teamId}`).set(auth)).status).toBe(404);
  });
});
