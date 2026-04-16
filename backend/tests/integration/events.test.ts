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

const createInteractionType = async (token: string, payload?: Record<string, unknown>) => {
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

const createEvent = async (teamId: string, token: string, payload: Record<string, unknown>) => {
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

  it("deletes an unused event offering", async () => {
    const created = await createOffering(context.superAdminToken);
    const id = created.body.data.id;

    const res = await request(app)
      .delete(`/api/event-offerings/${id}`)
      .set("Authorization", `Bearer ${context.superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted successfully/i);

    // Verify it's gone
    const listRes = await request(app)
      .get("/api/event-offerings")
      .set("Authorization", `Bearer ${context.teamAdminToken}`);
    expect(listRes.body.data.offerings.some((o: { id: string }) => o.id === id)).toBe(false);
  });

  it("lists events using an event offering", async () => {
    const offering = await createOffering(context.superAdminToken);
    const offId = offering.body.data.id;

    const interactionType = await createInteractionType(context.superAdminToken);
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Offering Usage Event",
      offeringId: offId,
      interactionTypeId: interactionType.body.data.id,
    });

    const res = await request(app)
      .get(`/api/event-offerings/${offId}/usage`)
      .set("Authorization", `Bearer ${context.superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      id: event.body.data.id,
      name: "Offering Usage Event",
      team: {
        id: context.teamId,
        name: "primary events team",
      },
    });
  });

  it("blocks deletion of an event offering used by events", async () => {
    const offering = await createOffering(context.superAdminToken);
    const offId = offering.body.data.id;

    const interactionType = await createInteractionType(context.superAdminToken);
    await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offId,
      interactionTypeId: interactionType.body.data.id,
    });

    const res = await request(app)
      .delete(`/api/event-offerings/${offId}`)
      .set("Authorization", `Bearer ${context.superAdminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/currently used by 1 event/i);
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

  it("rejects contradictory multi-host interaction types", async () => {
    const res = await createInteractionType(context.superAdminToken, {
      key: "bad-multi-host",
      name: "Bad Multi Host",
      supportsMultipleHosts: true,
      maxHosts: 1,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/maxHosts .* at least 2/i);
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

  it("deletes an unused interaction type", async () => {
    const created = await createInteractionType(context.superAdminToken);
    const id = created.body.data.id;

    const res = await request(app)
      .delete(`/api/event-interaction-types/${id}`)
      .set("Authorization", `Bearer ${context.superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted successfully/i);

    // Verify it's gone
    const listRes = await request(app)
      .get("/api/event-interaction-types")
      .set("Authorization", `Bearer ${context.teamAdminToken}`);
    expect(listRes.body.data.interactionTypes.some((t: { id: string }) => t.id === id)).toBe(false);
  });

  it("lists events and teams using an interaction type", async () => {
    const interactionType = await createInteractionType(context.superAdminToken);
    const itId = interactionType.body.data.id;

    const offering = await createOffering(context.superAdminToken);
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Usage Test Event",
      offeringId: offering.body.data.id,
      interactionTypeId: itId,
    });

    const res = await request(app)
      .get(`/api/event-interaction-types/${itId}/usage`)
      .set("Authorization", `Bearer ${context.superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      id: event.body.data.id,
      name: "Usage Test Event",
      team: {
        id: context.teamId,
        name: "primary events team",
      },
    });
  });

  it("blocks deletion of an interaction type used by events", async () => {
    const interactionType = await createInteractionType(context.superAdminToken);
    const itId = interactionType.body.data.id;

    const offering = await createOffering(context.superAdminToken);
    await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
      interactionTypeId: itId,
    });

    const res = await request(app)
      .delete(`/api/event-interaction-types/${itId}`)
      .set("Authorization", `Bearer ${context.superAdminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/currently used by 1 event/i);
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

  it("defaults to DIRECT assignment when the event does not choose a strategy", async () => {
    const offering = await createOffering(context.superAdminToken, {
      key: uniqueValue("round-robin-offering"),
      name: "Round Robin Offering",
    });
    const interactionType = await createInteractionType(context.superAdminToken, {
      key: uniqueValue("round-robin-interaction"),
      name: "Round Robin Interaction",
      supportsRoundRobin: true,
      supportsMultipleHosts: true,
      minHosts: 1,
      maxHosts: 4,
      minParticipants: 1,
      maxParticipants: 20,
    });

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Configured Event",
      offeringId: offering.body.data.id,
      interactionTypeId: interactionType.body.data.id,
      assignmentStrategy: undefined,
      minParticipantCount: 2,
      maxParticipantCount: 8,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.assignmentStrategy).toBe("DIRECT");
    expect(res.body.data.minParticipantCount).toBe(2);
    expect(res.body.data.maxParticipantCount).toBe(8);
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
      res.body.data.events.some((event: { id: string }) => event.id === created.body.data.id),
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

  it("hard deletes an event", async () => {
    const offering = await createOffering(context.superAdminToken);
    const interactionType = await createInteractionType(context.superAdminToken);
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Deletable Event",
      offeringId: offering.body.data.id,
      interactionTypeId: interactionType.body.data.id,
    });
    const eventId = created.body.data.id;

    const res = await request(app)
      .delete(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);

    // Verify it's actually gone
    const readRes = await request(app)
      .get(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);
    expect(readRes.status).toBe(404);
  });

  it("blocks hard deletion of an event with bookings", async () => {
    const offering = await createOffering(context.superAdminToken, {
      key: uniqueValue("delete-booking-offering"),
      name: "Delete Booking Offering",
    });
    const interactionType = await createInteractionType(context.superAdminToken, {
      key: uniqueValue("delete-booking-interaction"),
      name: "Delete Booking Interaction",
    });
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Event with Booking",
      offeringId: offering.body.data.id,
      interactionTypeId: interactionType.body.data.id,
      bookingMode: "FIXED_SLOTS",
      allowedWeekdays: [0, 1, 2, 3, 4, 5, 6],
    });
    const eventId = event.body.data.id;

    // Create a 30-minute slot (matching default 1800 durationSeconds)
    const startTime = new Date(Date.now() + 86400000);
    startTime.setUTCMinutes(0, 0, 0);
    const endTime = new Date(startTime.getTime() + 1800 * 1000);

    const slotRes = await request(app)
      .post(`/api/events/${eventId}/schedule-slots`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        capacity: 1,
      });

    expect(slotRes.status).toBe(201);

    // Add a host (required for booking)
    await request(app)
      .put(`/api/events/${eventId}/hosts`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        hosts: [{ userId: context.coachOneId, hostOrder: 1 }],
      });

    // Create a booking
    const bookingRes = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        eventId,
        teamId: context.teamId,
        scheduleSlotId: slotRes.body.data.id,
        studentName: "Test Student",
        studentEmail: "student@example.com",
        startTime: slotRes.body.data.startTime,
        endTime: slotRes.body.data.endTime,
      });

    expect(bookingRes.status).toBe(201);

    // Try to delete event
    const res = await request(app)
      .delete(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.message).toContain("booking(s)");
  });

  it("deactivates an event via PATCH", async () => {
    const offering = await createOffering(context.superAdminToken);
    const interactionType = await createInteractionType(context.superAdminToken);
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Deactivatable Event",
      offeringId: offering.body.data.id,
      interactionTypeId: interactionType.body.data.id,
    });
    const eventId = created.body.data.id;

    const res = await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it("duplicates an event with hosts", async () => {
    const offering = await createOffering(context.superAdminToken);
    const interactionType = await createInteractionType(context.superAdminToken);
    const originalEvent = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Original Event",
      offeringId: offering.body.data.id,
      interactionTypeId: interactionType.body.data.id,
      description: "Original description",
    });
    const eventId = originalEvent.body.data.id;

    // Add a host to the original event
    await request(app)
      .put(`/api/events/${eventId}/hosts`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        hosts: [{ userId: context.coachOneId, hostOrder: 1 }],
      });

    // Duplicate the event
    const res = await request(app)
      .post(`/api/events/${eventId}/duplicate`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Copy of Original Event");
    expect(res.body.data.description).toBe("Original description");
    expect(res.body.data.isActive).toBe(false);
    expect(res.body.data.publicBookingSlug).not.toBe(originalEvent.body.data.publicBookingSlug);
    expect(res.body.data.hosts).toHaveLength(1);
    expect(res.body.data.hosts[0].hostUserId).toBe(context.coachOneId);
  });

  it("creates an event with FIXED_LEAD and automatically assigns the host", async () => {
    const offering = await createOffering(context.superAdminToken);
    const interactionType = await createInteractionType(context.superAdminToken, {
      supportsSimultaneousCoaches: true,
      supportsMultipleHosts: true,
      minHosts: 1,
      maxHosts: 4,
    });

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Fixed Lead Event",
      offeringId: offering.body.data.id,
      interactionTypeId: interactionType.body.data.id,
      sessionLeadershipStrategy: "FIXED_LEAD",
      fixedLeadHostId: context.coachOneId,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.sessionLeadershipStrategy).toBe("FIXED_LEAD");
    expect(res.body.data.fixedLeadHostId).toBe(context.coachOneId);
    expect(res.body.data.hosts).toHaveLength(1);
    expect(res.body.data.hosts[0].hostUserId).toBe(context.coachOneId);
  });
});

describe("Event scheduling routes", () => {
  it("creates and updates an event with advanced scheduling settings", async () => {
    const offering = await createOffering(context.superAdminToken, {
      key: uniqueValue("fixed-slot-offering"),
      name: "Fixed Slot Offering",
    });
    const interactionType = await createInteractionType(context.superAdminToken, {
      key: uniqueValue("group-session"),
      name: "Group Session",
      supportsMultipleHosts: true,
      maxHosts: null,
      minParticipants: 2,
      maxParticipants: 12,
    });

    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Advanced Scheduling Event",
      offeringId: offering.body.data.id,
      interactionTypeId: interactionType.body.data.id,
      bookingMode: "FIXED_SLOTS",
      allowedWeekdays: [1, 4],
      minimumNoticeMinutes: 360,
      minParticipantCount: 2,
      maxParticipantCount: 8,
    });

    expect(created.status).toBe(201);
    expect(created.body.data.bookingMode).toBe("FIXED_SLOTS");
    expect(created.body.data.allowedWeekdays).toEqual([1, 4]);
    expect(created.body.data.minimumNoticeMinutes).toBe(360);
    expect(created.body.data.minParticipantCount).toBe(2);
    expect(created.body.data.maxParticipantCount).toBe(8);

    const updated = await request(app)
      .patch(`/api/events/${created.body.data.id}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        bookingMode: "HOST_AVAILABILITY",
        allowedWeekdays: [],
        minimumNoticeMinutes: 60,
      });

    expect(updated.status).toBe(200);
    expect(updated.body.data.bookingMode).toBe("HOST_AVAILABILITY");
    expect(updated.body.data.allowedWeekdays).toEqual([]);
    expect(updated.body.data.minimumNoticeMinutes).toBe(60);
  });

  it("creates, updates, lists, and deletes predefined schedule slots", async () => {
    const offering = await createOffering(context.superAdminToken, {
      key: uniqueValue("slot-offering"),
      name: "Slot Offering",
    });
    const interactionType = await createInteractionType(context.superAdminToken, {
      key: uniqueValue("slot-interaction"),
      name: "Slot Interaction",
    });
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Slot Managed Event",
      offeringId: offering.body.data.id,
      interactionTypeId: interactionType.body.data.id,
      bookingMode: "FIXED_SLOTS",
    });
    const eventId = event.body.data.id as string;

    const startTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    startTime.setUTCMinutes(0, 0, 0);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

    const createRes = await request(app)
      .post(`/api/events/${eventId}/schedule-slots`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        capacity: 5,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.capacity).toBe(5);

    const slotId = createRes.body.data.id as string;

    const listRes = await request(app)
      .get(`/api/events/${eventId}/schedule-slots`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.slots).toHaveLength(1);
    expect(listRes.body.data.slots[0].id).toBe(slotId);

    const updateRes = await request(app)
      .patch(`/api/events/${eventId}/schedule-slots/${slotId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ capacity: 8 });

    if (updateRes.status !== 200) {
      console.log("updateRes.body:", updateRes.body);
    }
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.capacity).toBe(8);

    const deleteRes = await request(app)
      .delete(`/api/events/${eventId}/schedule-slots/${slotId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toMatch(/deleted/i);
  });

  it("blocks deletion of a schedule slot with active bookings", async () => {
    const offering = await createOffering(context.superAdminToken);
    const interactionType = await createInteractionType(context.superAdminToken);
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
      interactionTypeId: interactionType.body.data.id,
      bookingMode: "FIXED_SLOTS",
    });
    const eventId = event.body.data.id as string;

    const startTime = new Date(Date.now() + 2 * 86400000);
    startTime.setUTCMinutes(0, 0, 0);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

    const slotRes = await request(app)
      .post(`/api/events/${eventId}/schedule-slots`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        capacity: 1,
      });

    const slotId = slotRes.body.data.id;

    // Add a host
    await request(app)
      .put(`/api/events/${eventId}/hosts`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        hosts: [{ userId: context.coachOneId, hostOrder: 1 }],
      });

    // Create a booking
    const bookingRes = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        eventId,
        teamId: context.teamId,
        scheduleSlotId: slotId,
        studentName: "Test Student",
        studentEmail: "student@example.com",
        startTime: slotRes.body.data.startTime,
        endTime: slotRes.body.data.endTime,
      });

    expect(bookingRes.status).toBe(201);

    // Try to delete slot
    const res = await request(app)
      .delete(`/api/events/${eventId}/schedule-slots/${slotId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/active booking/i);
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

  it("rejects removing a host from a round-robin event if it leaves fewer than two hosts", async () => {
    const offering = await createOffering(context.superAdminToken);
    const interactionType = await createInteractionType(context.superAdminToken, {
      supportsRoundRobin: true,
      supportsMultipleHosts: true,
      minHosts: 2,
      maxHosts: null,
    });
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
      interactionTypeId: interactionType.body.data.id,
      assignmentStrategy: "ROUND_ROBIN",
    });
    const eventId = event.body.data.id as string;

    // Add two hosts
    await request(app)
      .put(`/api/events/${eventId}/hosts`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        hosts: [
          { userId: context.coachOneId, hostOrder: 1 },
          { userId: context.coachTwoId, hostOrder: 2 },
        ],
      });

    // Try removing one
    const res = await request(app)
      .delete(`/api/events/${eventId}/hosts/${context.coachOneId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/ROUND_ROBIN events require at least two hosts/i);
  });

  it("rejects updating strategy to ROUND_ROBIN if event has fewer than two hosts", async () => {
    const offering = await createOffering(context.superAdminToken);
    const interactionType = await createInteractionType(context.superAdminToken, {
      supportsRoundRobin: true,
      supportsMultipleHosts: true,
      minHosts: 2,
      maxHosts: null,
    });
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
      interactionTypeId: interactionType.body.data.id,
      assignmentStrategy: "DIRECT",
    });
    const eventId = event.body.data.id as string;

    // Add only one host
    await request(app)
      .put(`/api/events/${eventId}/hosts`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        hosts: [{ userId: context.coachOneId, hostOrder: 1 }],
      });

    // Try updating to ROUND_ROBIN
    const res = await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        assignmentStrategy: "ROUND_ROBIN",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/ROUND_ROBIN events require at least two hosts/i);
  });
});
