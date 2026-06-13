import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/shared/db/prisma";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";

// Returns the next UTC occurrence of targetDay (0=Sun..6=Sat) at the given hour/minute.
// Always returns a date at least 1 day in the future.
const getNextUtcWeekdayAt = (targetDay: number, hour: number, minute = 0): Date => {
  const now = new Date();
  const currentDay = now.getUTCDay();
  const daysAhead = (targetDay - currentDay + 7) % 7 || 7;
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysAhead,
      hour,
      minute,
      0,
      0,
    ),
  );
};

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

const createEventType = async (token: string, payload?: Record<string, unknown>) => {
  const res = await request(app)
    .post("/api/event-types")
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

const createEvent = async (teamId: string, token: string, payload: Record<string, unknown>) => {
  return request(app)
    .post(`/api/teams/${teamId}/events`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: uniqueValue("Event"),
      description: "Event description",
      interactionType: "ONE_TO_ONE",
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

describe("Event types routes", () => {
  it("creates an event type and normalizes the key", async () => {
    const res = await createEventType(context.superAdminToken, {
      key: "  Resume Review Offering  ",
      name: "Resume Review Offering",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.key).toBe("resume-review-offering");
    expect(res.body.data.name).toBe("Resume Review Offering");
  });

  it("lists event types", async () => {
    const created = await createEventType(context.superAdminToken);

    const res = await request(app)
      .get("/api/event-types")
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.eventTypes)).toBe(true);
    expect(
      res.body.data.eventTypes.some(
        (offering: { id: string }) => offering.id === created.body.data.id,
      ),
    ).toBe(true);
  });

  it("updates an event type", async () => {
    const created = await createEventType(context.superAdminToken, {
      key: uniqueValue("offering"),
      name: "Original Offering",
    });

    const res = await request(app)
      .patch(`/api/event-types/${created.body.data.id}`)
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

  it("rejects event type creation for a COACH", async () => {
    const res = await createEventType(context.coachToken);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("deletes an unused event type", async () => {
    const created = await createEventType(context.superAdminToken);
    const id = created.body.data.id;

    const res = await request(app)
      .delete(`/api/event-types/${id}`)
      .set("Authorization", `Bearer ${context.superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted successfully/i);

    // Verify it's gone
    const listRes = await request(app)
      .get("/api/event-types")
      .set("Authorization", `Bearer ${context.teamAdminToken}`);
    expect(listRes.body.data.eventTypes.some((o: { id: string }) => o.id === id)).toBe(false);
  });

  it("lists events using an event type", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const etId = eventType.body.data.id;

    const event = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Offering Usage Event",
      eventTypeId: etId,
    });

    const res = await request(app)
      .get(`/api/event-types/${etId}/usage`)
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

  it("blocks deletion of an event type used by events", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const etId = eventType.body.data.id;

    await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: etId,
    });

    const res = await request(app)
      .delete(`/api/event-types/${etId}`)
      .set("Authorization", `Bearer ${context.superAdminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/currently used by 1 event/i);
  });
});

describe("Interaction type routes", () => {
  it("lists the four hardcoded interaction types", async () => {
    const res = await request(app)
      .get("/api/event-interaction-types")
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.interactionTypes)).toBe(true);
    expect(res.body.data.interactionTypes).toHaveLength(4);
    expect(res.body.data.interactionTypes.map((t: { key: string }) => t.key)).toEqual(
      expect.arrayContaining(["ONE_TO_ONE", "ONE_TO_MANY", "MANY_TO_ONE", "MANY_TO_MANY"]),
    );
    expect(res.body.data.interactionTypes[0]).toMatchObject({
      key: expect.any(String),
      label: expect.any(String),
      caps: {
        multipleCoaches: expect.any(Boolean),
        multipleParticipants: expect.any(Boolean),
        derivesLeadershipFromAssignment: expect.any(Boolean),
      },
    });
  });

  it("returns correct derivesLeadershipFromAssignment values for all four interaction types", async () => {
    const res = await request(app)
      .get("/api/event-interaction-types")
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(res.status).toBe(200);

    const types: Array<{ key: string; caps: { derivesLeadershipFromAssignment: boolean } }> =
      res.body.data.interactionTypes;
    const byKey = Object.fromEntries(types.map((t) => [t.key, t.caps]));

    expect(byKey["ONE_TO_ONE"].derivesLeadershipFromAssignment).toBe(false);
    expect(byKey["ONE_TO_MANY"].derivesLeadershipFromAssignment).toBe(false);
    expect(byKey["MANY_TO_ONE"].derivesLeadershipFromAssignment).toBe(true);
    expect(byKey["MANY_TO_MANY"].derivesLeadershipFromAssignment).toBe(true);
  });
});

describe("Event CRUD routes", () => {
  it("creates a team event", async () => {
    const eventType = await createEventType(context.superAdminToken, {
      key: uniqueValue("career-coaching"),
      name: "Career Coaching",
    });

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Career Coaching Session",
      eventTypeId: eventType.body.data.id,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Career Coaching Session");
    expect(res.body.data.eventType.id).toBe(eventType.body.data.id);
    expect(res.body.data.interactionType).toBe("ONE_TO_ONE");
  });

  it("defaults to DIRECT assignment when the event does not choose a strategy", async () => {
    const eventType = await createEventType(context.superAdminToken, {
      key: uniqueValue("round-robin-offering"),
      name: "Round Robin Offering",
    });

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Configured Event",
      eventTypeId: eventType.body.data.id,
      interactionType: "ONE_TO_MANY",
      assignmentStrategy: undefined,
      bookingMode: "FIXED_SLOTS",
      maxParticipantCount: 8,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.assignmentStrategy).toBe("DIRECT");
    expect(res.body.data.bookingMode).toBe("FIXED_SLOTS");
    expect(res.body.data.maxParticipantCount).toBe(8);
  });

  it("forbids a TEAM_ADMIN from managing another team", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.otherTeamAdminToken, {
      name: "Unauthorized Event",
      eventTypeId: eventType.body.data.id,
    });

    expect(res.status).toBe(403);
  });

  it("lists team events with pagination", async () => {
    const eventType = await createEventType(context.superAdminToken, {
      key: uniqueValue("list-offering"),
      name: "List Offering",
    });
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Listable Event",
      eventTypeId: eventType.body.data.id,
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
    const eventType = await createEventType(context.superAdminToken, {
      key: uniqueValue("read-offering"),
      name: "Read Offering",
    });
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Readable Event",
      eventTypeId: eventType.body.data.id,
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

  it("updates general details on a ONE_TO_MANY event without breaking fixed-slot enforcement", async () => {
    const eventType = await createEventType(context.superAdminToken, {
      key: uniqueValue("otm-general-update"),
    });
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "OTM General Details Event",
      eventTypeId: eventType.body.data.id,
      interactionType: "ONE_TO_MANY",
      assignmentStrategy: "DIRECT",
      bookingMode: "FIXED_SLOTS",
    });
    expect(created.status).toBe(201);
    const eventId = created.body.data.id;

    const updateRes = await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        name: "OTM Updated Name",
        description: "OTM updated description",
        durationSeconds: 3600,
        locationValue: "https://meet.example.com/otm-updated",
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.name).toBe("OTM Updated Name");
    expect(updateRes.body.data.description).toBe("OTM updated description");
    expect(updateRes.body.data.durationSeconds).toBe(3600);
    expect(updateRes.body.data.locationValue).toBe("https://meet.example.com/otm-updated");
    // Group-type enforcement must survive a general-fields-only patch
    expect(updateRes.body.data.bookingMode).toBe("FIXED_SLOTS");
    expect(updateRes.body.data.sessionLeadershipStrategy).toBe("SINGLE_COACH");
  });

  it("updates general details on a MANY_TO_ONE (ROUND_ROBIN) event without disrupting auto-derived leadership", async () => {
    const eventType = await createEventType(context.superAdminToken, {
      key: uniqueValue("mto-general-update"),
    });
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTO General Details Event",
      eventTypeId: eventType.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "ROUND_ROBIN",
    });
    expect(created.status).toBe(201);
    expect(created.body.data.sessionLeadershipStrategy).toBe("ROTATING_LEAD");
    const eventId = created.body.data.id;

    const updateRes = await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        name: "MTO Updated Name",
        description: "MTO updated description",
        durationSeconds: 2700,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.name).toBe("MTO Updated Name");
    expect(updateRes.body.data.description).toBe("MTO updated description");
    expect(updateRes.body.data.durationSeconds).toBe(2700);
    // Leadership must remain auto-derived; a name-only patch must not reset it
    expect(updateRes.body.data.sessionLeadershipStrategy).toBe("ROTATING_LEAD");
    expect(updateRes.body.data.assignmentStrategy).toBe("ROUND_ROBIN");
  });

  it("updates general details on a MANY_TO_MANY (ROUND_ROBIN) event without disrupting auto-derived leadership", async () => {
    const eventType = await createEventType(context.superAdminToken, {
      key: uniqueValue("mtm-general-update"),
    });
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTM General Details Event",
      eventTypeId: eventType.body.data.id,
      interactionType: "MANY_TO_MANY",
      assignmentStrategy: "ROUND_ROBIN",
      bookingMode: "FIXED_SLOTS",
      maxParticipantCount: 10,
    });
    expect(created.status).toBe(201);
    expect(created.body.data.sessionLeadershipStrategy).toBe("ROTATING_LEAD");
    expect(created.body.data.bookingMode).toBe("FIXED_SLOTS");
    const eventId = created.body.data.id;

    const updateRes = await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        name: "MTM Updated Name",
        description: "MTM updated description",
        locationValue: "https://meet.example.com/mtm-updated",
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.name).toBe("MTM Updated Name");
    expect(updateRes.body.data.description).toBe("MTM updated description");
    expect(updateRes.body.data.locationValue).toBe("https://meet.example.com/mtm-updated");
    // Both group-type enforcement and auto-derived leadership must survive
    expect(updateRes.body.data.bookingMode).toBe("FIXED_SLOTS");
    expect(updateRes.body.data.sessionLeadershipStrategy).toBe("ROTATING_LEAD");
  });

  it("hard deletes an event", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Deletable Event",
      eventTypeId: eventType.body.data.id,
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
    const eventType = await createEventType(context.superAdminToken, {
      key: uniqueValue("delete-booking-offering"),
      name: "Delete Booking Offering",
    });
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Event with Booking",
      eventTypeId: eventType.body.data.id,
      bookingMode: "FIXED_SLOTS",
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

    // Add a coach (required for booking)
    await request(app)
      .put(`/api/events/${eventId}/coaches`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        coaches: [{ userId: context.coachOneId, coachOrder: 1 }],
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
    const eventType = await createEventType(context.superAdminToken);
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Deactivatable Event",
      eventTypeId: eventType.body.data.id,
    });
    const eventId = created.body.data.id;

    const res = await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it("duplicates an event with coaches", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const originalEvent = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Original Event",
      eventTypeId: eventType.body.data.id,
      description: "Original description",
    });
    const eventId = originalEvent.body.data.id;

    // Add a coach to the original event
    await request(app)
      .put(`/api/events/${eventId}/coaches`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        coaches: [{ userId: context.coachOneId, coachOrder: 1 }],
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
    expect(res.body.data.coaches).toHaveLength(1);
    expect(res.body.data.coaches[0].coachUserId).toBe(context.coachOneId);
  });

  it("duplicates a MANY_TO_ONE event and ensures leadership strategy is correctly derived", async () => {
    const eventType = await createEventType(context.superAdminToken);

    // Create a MANY_TO_ONE event via DIRECT strategy
    // In our system, MANY_TO_ONE + DIRECT => FIXED_LEAD
    const originalEvent = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTO Direct Event",
      eventTypeId: eventType.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "DIRECT",
      fixedLeadCoachId: context.coachOneId,
    });

    expect(originalEvent.body.data.sessionLeadershipStrategy).toBe("FIXED_LEAD");
    const eventId = originalEvent.body.data.id;

    // Duplicate the event
    const res = await request(app)
      .post(`/api/events/${eventId}/duplicate`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Copy of MTO Direct Event");

    // Verify common fields
    expect(res.body.data.interactionType).toBe("MANY_TO_ONE");
    expect(res.body.data.assignmentStrategy).toBe("DIRECT");

    // Verify derived leadership (Direct + MTO => FIXED_LEAD)
    expect(res.body.data.sessionLeadershipStrategy).toBe("FIXED_LEAD");
    expect(res.body.data.fixedLeadCoachId).toBe(context.coachOneId);
  });

  it("creates an event with FIXED_LEAD and automatically assigns the coach", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Fixed Lead Event",
      eventTypeId: eventType.body.data.id,
      interactionType: "MANY_TO_ONE",
      sessionLeadershipStrategy: "FIXED_LEAD",
      fixedLeadCoachId: context.coachOneId,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.sessionLeadershipStrategy).toBe("FIXED_LEAD");
    expect(res.body.data.fixedLeadCoachId).toBe(context.coachOneId);
    expect(res.body.data.coaches).toHaveLength(1);
    expect(res.body.data.coaches[0].coachUserId).toBe(context.coachOneId);
  });
});

describe("Event scheduling routes", () => {
  it("creates and updates an event with advanced scheduling settings", async () => {
    const eventType = await createEventType(context.superAdminToken, {
      key: uniqueValue("fixed-slot-offering"),
      name: "Fixed Slot Offering",
    });

    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Advanced Scheduling Event",
      eventTypeId: eventType.body.data.id,
      interactionType: "ONE_TO_MANY",
      bookingMode: "FIXED_SLOTS",
      minimumNoticeMinutes: 360,
      maxParticipantCount: 8,
    });

    expect(created.status).toBe(201);
    expect(created.body.data.bookingMode).toBe("FIXED_SLOTS");
    expect(created.body.data.minimumNoticeMinutes).toBe(360);
    expect(created.body.data.maxParticipantCount).toBe(8);

    const updated = await request(app)
      .patch(`/api/events/${created.body.data.id}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        minimumNoticeMinutes: 60,
      });

    // ONE_TO_MANY events are permanently locked to FIXED_SLOTS — bookingMode cannot be changed.
    expect(updated.status).toBe(200);
    expect(updated.body.data.bookingMode).toBe("FIXED_SLOTS");
    expect(updated.body.data.minimumNoticeMinutes).toBe(60);
  });

  it("creates, updates, lists, and deletes predefined schedule slots", async () => {
    const eventType = await createEventType(context.superAdminToken, {
      key: uniqueValue("slot-offering"),
      name: "Slot Offering",
    });
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Slot Managed Event",
      eventTypeId: eventType.body.data.id,
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

  it("supports continuous recurring slots and stopping them", async () => {
    const eventType = await createEventType(context.superAdminToken, {
      key: uniqueValue("continuous-offering"),
      name: "Continuous Offering",
    });
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Continuous Slot Event",
      eventTypeId: eventType.body.data.id,
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
        recurrence: {
          frequency: "WEEKLY",
          isContinuous: true,
        },
      });

    expect(createRes.status).toBe(201);
    const recurrenceGroupId = createRes.body.data.recurrenceGroupId;
    expect(recurrenceGroupId).toBeDefined();

    // Query internal slots - triggers replenishment
    const listRes = await request(app)
      .get(`/api/events/${eventId}/schedule-slots`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(listRes.status).toBe(200);
    // Since it's continuous, it should have replenished many weekly slots
    expect(listRes.body.data.slots.length).toBeGreaterThan(1);
    expect(listRes.body.data.slots[0].recurrenceGroup.isContinuous).toBe(true);
    expect(listRes.body.data.slots[0].recurrenceGroup.isActive).toBe(true);

    // Stop the recurrence group
    const stopRes = await request(app)
      .post(`/api/events/${eventId}/recurrence-groups/${recurrenceGroupId}/stop`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(stopRes.status).toBe(200);
    expect(stopRes.body.message).toMatch(/stopped successfully/i);

    // Query again and verify it is stopped
    const listResAfter = await request(app)
      .get(`/api/events/${eventId}/schedule-slots`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(listResAfter.body.data.slots[0].recurrenceGroup.isActive).toBe(false);

    // Resume the recurrence group
    const resumeRes = await request(app)
      .post(`/api/events/${eventId}/recurrence-groups/${recurrenceGroupId}/resume`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(resumeRes.status).toBe(200);
    expect(resumeRes.body.message).toMatch(/resumed successfully/i);

    // Query again and verify it is active again
    const listResAfterResume = await request(app)
      .get(`/api/events/${eventId}/schedule-slots`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(listResAfterResume.body.data.slots[0].recurrenceGroup.isActive).toBe(true);
  });

  it("respects recurrenceVisibilityLimit on public booking slots", async () => {
    const eventType = await createEventType(context.superAdminToken, {
      key: uniqueValue("visibility-offering"),
      name: "Visibility Offering",
    });
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Visibility Limited Event",
      eventTypeId: eventType.body.data.id,
      bookingMode: "FIXED_SLOTS",
      recurrenceVisibilityLimit: 2,
    });
    const eventId = event.body.data.id as string;

    // Assign coach to event so public availability endpoint returns slots
    await request(app)
      .put(`/api/events/${eventId}/coaches`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ coaches: [{ userId: context.coachOneId }] });

    const sunday = getNextUtcWeekdayAt(0, 10);

    // Create 5 occurrences starting on Sunday
    const createRes = await request(app)
      .post(`/api/events/${eventId}/schedule-slots`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        startTime: sunday.toISOString(),
        endTime: new Date(sunday.getTime() + 30 * 60 * 1000).toISOString(),
        capacity: 5,
        recurrence: {
          frequency: "WEEKLY",
          occurrences: 5,
        },
      });

    expect(createRes.status).toBe(201);

    // Fetch internal slots to verify all 5 exist
    const listRes = await request(app)
      .get(`/api/events/${eventId}/schedule-slots`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);
    expect(listRes.body.data.slots).toHaveLength(5);

    // Query public availability
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const availRes = await request(app)
      .get(`/api/public/events/${eventId}/slots`)
      .query({ startDate: startDate.toISOString(), endDate: endDate.toISOString() });

    expect(availRes.status).toBe(200);
    // Should be capped to the recurrenceVisibilityLimit (2)
    expect(availRes.body.data.slots).toHaveLength(2);
  });

  it("blocks deletion of a schedule slot with active bookings", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
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

    // Add a coach
    await request(app)
      .put(`/api/events/${eventId}/coaches`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        coaches: [{ userId: context.coachOneId, coachOrder: 1 }],
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

describe("Event coach routes", () => {
  it("assigns and lists a single coach for a one-to-one event", async () => {
    const eventType = await createEventType(context.superAdminToken, {
      key: uniqueValue("coach-offering"),
      name: "Coach Offering",
    });
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Coached Event",
      eventTypeId: eventType.body.data.id,
    });
    const eventId = event.body.data.id as string;

    const updateCoachesRes = await request(app)
      .put(`/api/events/${eventId}/coaches`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        coaches: [{ userId: context.coachOneId, coachOrder: 1 }],
      });

    expect(updateCoachesRes.status).toBe(200);
    expect(updateCoachesRes.body.data.coaches).toHaveLength(1);
    expect(updateCoachesRes.body.data.coaches[0].coachUserId).toBe(context.coachOneId);

    const listCoachesRes = await request(app)
      .get(`/api/events/${eventId}/coaches`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(listCoachesRes.status).toBe(200);
    expect(listCoachesRes.body.data.coaches).toHaveLength(1);
  });

  it("rejects assigning too few coaches for a round-robin event", async () => {
    const eventType = await createEventType(context.superAdminToken, {
      key: uniqueValue("rr-offering"),
      name: "Round Robin Offering",
    });
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Round Robin Event",
      eventTypeId: eventType.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "ROUND_ROBIN",
    });

    const res = await request(app)
      .put(`/api/events/${event.body.data.id}/coaches`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        coaches: [{ userId: context.coachOneId, coachOrder: 1 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/round-robin requires at least 2 coaches/i);
  });

  it("removes an assigned coach", async () => {
    const eventType = await createEventType(context.superAdminToken, {
      key: uniqueValue("remove-coach-offering"),
      name: "Remove Coach Offering",
    });
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Coach Removal Event",
      eventTypeId: eventType.body.data.id,
    });
    const eventId = event.body.data.id as string;

    await request(app)
      .put(`/api/events/${eventId}/coaches`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        coaches: [{ userId: context.coachOneId, coachOrder: 1 }],
      });

    const res = await request(app)
      .delete(`/api/events/${eventId}/coaches/${context.coachOneId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.coaches).toHaveLength(0);
  });

  it("rejects removing a coach from a round-robin event if it leaves fewer than two coaches", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "ROUND_ROBIN",
    });
    const eventId = event.body.data.id as string;

    // Add two coaches
    await request(app)
      .put(`/api/events/${eventId}/coaches`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        coaches: [
          { userId: context.coachOneId, coachOrder: 1 },
          { userId: context.coachTwoId, coachOrder: 2 },
        ],
      });

    // Try removing one
    const res = await request(app)
      .delete(`/api/events/${eventId}/coaches/${context.coachOneId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/round-robin requires at least 2 coaches/i);
  });

  it("rejects updating strategy to ROUND_ROBIN if event has fewer than two coaches", async () => {
    const eventType = await createEventType(context.superAdminToken);
    // MANY_TO_ONE + DIRECT → FIXED_LEAD leadership, which requires a fixedLeadCoachId
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "DIRECT",
      fixedLeadCoachId: context.coachOneId,
    });
    const eventId = event.body.data.id as string;

    // Replace coaches with only one coach (the fixed lead is auto-added on create;
    // the PUT replaces the list so the count stays at one)
    await request(app)
      .put(`/api/events/${eventId}/coaches`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        coaches: [{ userId: context.coachOneId, coachOrder: 1 }],
      });

    // Try updating to ROUND_ROBIN
    const res = await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        assignmentStrategy: "ROUND_ROBIN",
      });

    expect(res.status).toBe(400);
    // Service-level check fires when the coach count is below the ROUND_ROBIN minimum.
    expect(res.body.message).toMatch(/round-robin requires at least 2 coaches/i);
  });
});

// ─── Leadership Auto-Derivation ───────────────────────────────────────────────

describe("Leadership auto-derivation (derivesLeadershipFromAssignment types)", () => {
  it("MANY_TO_ONE + DIRECT derives sessionLeadershipStrategy to FIXED_LEAD (no explicit leadership in payload)", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTO Direct — auto FIXED_LEAD",
      eventTypeId: eventType.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "DIRECT",
      fixedLeadCoachId: context.coachOneId,
      // sessionLeadershipStrategy intentionally absent — must be auto-derived
    });

    expect(res.status).toBe(201);
    expect(res.body.data.sessionLeadershipStrategy).toBe("FIXED_LEAD");
    expect(res.body.data.fixedLeadCoachId).toBe(context.coachOneId);
  });

  it("MANY_TO_ONE + ROUND_ROBIN derives sessionLeadershipStrategy to ROTATING_LEAD (no explicit leadership in payload)", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTO Round Robin — auto ROTATING_LEAD",
      eventTypeId: eventType.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "ROUND_ROBIN",
      // sessionLeadershipStrategy intentionally absent — must be auto-derived
    });

    expect(res.status).toBe(201);
    expect(res.body.data.sessionLeadershipStrategy).toBe("ROTATING_LEAD");
    expect(res.body.data.fixedLeadCoachId).toBeNull();
  });

  it("MANY_TO_MANY + DIRECT derives sessionLeadershipStrategy to FIXED_LEAD", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTM Direct — auto FIXED_LEAD",
      eventTypeId: eventType.body.data.id,
      interactionType: "MANY_TO_MANY",
      assignmentStrategy: "DIRECT",
      bookingMode: "FIXED_SLOTS",
      fixedLeadCoachId: context.coachOneId,
      maxParticipantCount: 10,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.sessionLeadershipStrategy).toBe("FIXED_LEAD");
    expect(res.body.data.fixedLeadCoachId).toBe(context.coachOneId);
    expect(res.body.data.bookingMode).toBe("FIXED_SLOTS");
  });

  it("MANY_TO_MANY + ROUND_ROBIN derives sessionLeadershipStrategy to ROTATING_LEAD", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTM Round Robin — auto ROTATING_LEAD",
      eventTypeId: eventType.body.data.id,
      interactionType: "MANY_TO_MANY",
      assignmentStrategy: "ROUND_ROBIN",
      bookingMode: "FIXED_SLOTS",
      maxParticipantCount: 10,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.sessionLeadershipStrategy).toBe("ROTATING_LEAD");
    expect(res.body.data.fixedLeadCoachId).toBeNull();
    expect(res.body.data.bookingMode).toBe("FIXED_SLOTS");
  });

  it("overrides user-provided sessionLeadershipStrategy for derivesLeadershipFromAssignment types — reform always wins", async () => {
    const eventType = await createEventType(context.superAdminToken);

    // User explicitly provides ROTATING_LEAD for a DIRECT event.
    // The reform (step 4) must override it to FIXED_LEAD because assignmentStrategy = DIRECT.
    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTO reform override test",
      eventTypeId: eventType.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "DIRECT",
      fixedLeadCoachId: context.coachOneId,
      sessionLeadershipStrategy: "ROTATING_LEAD", // user forces ROTATING_LEAD
    });

    expect(res.status).toBe(201);
    // Reform overrides user input: DIRECT → FIXED_LEAD
    expect(res.body.data.sessionLeadershipStrategy).toBe("FIXED_LEAD");
  });

  it("rejects MANY_TO_ONE + DIRECT when fixedLeadCoachId is missing (reform derives FIXED_LEAD which requires it)", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTO Direct — no lead coach",
      eventTypeId: eventType.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "DIRECT",
      // fixedLeadCoachId intentionally absent: reform derives FIXED_LEAD,
      // then validateEventConfiguration rejects because fixedLeadCoachId is null.
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/FIXED_LEAD events require a fixedLeadCoachId/i);
  });

  it("re-derives sessionLeadershipStrategy when assignmentStrategy is updated on a MANY_TO_ONE event", async () => {
    const eventType = await createEventType(context.superAdminToken);

    // 1. Create with DIRECT → FIXED_LEAD
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTO strategy update",
      eventTypeId: eventType.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "DIRECT",
      fixedLeadCoachId: context.coachOneId,
    });
    expect(created.status).toBe(201);
    expect(created.body.data.sessionLeadershipStrategy).toBe("FIXED_LEAD");
    const eventId = created.body.data.id as string;

    // 2. Ensure two coaches are assigned so ROUND_ROBIN validation passes
    await request(app)
      .put(`/api/events/${eventId}/coaches`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        coaches: [
          { userId: context.coachOneId, coachOrder: 1 },
          { userId: context.coachTwoId, coachOrder: 2 },
        ],
      });

    // 3. Update to ROUND_ROBIN → reform must re-derive ROTATING_LEAD
    const updated = await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ assignmentStrategy: "ROUND_ROBIN" });

    expect(updated.status).toBe(200);
    expect(updated.body.data.sessionLeadershipStrategy).toBe("ROTATING_LEAD");
  });

  it("re-derives sessionLeadershipStrategy when assignmentStrategy is updated on a MANY_TO_MANY event", async () => {
    const eventType = await createEventType(context.superAdminToken);

    // 1. Create with ROUND_ROBIN → ROTATING_LEAD
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTM strategy update",
      eventTypeId: eventType.body.data.id,
      interactionType: "MANY_TO_MANY",
      assignmentStrategy: "ROUND_ROBIN",
      bookingMode: "FIXED_SLOTS",
      maxParticipantCount: 5,
    });
    expect(created.status).toBe(201);
    expect(created.body.data.sessionLeadershipStrategy).toBe("ROTATING_LEAD");
    const eventId = created.body.data.id as string;

    // 2. Update to DIRECT → reform must re-derive FIXED_LEAD
    const updated = await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ assignmentStrategy: "DIRECT", fixedLeadCoachId: context.coachOneId });

    expect(updated.status).toBe(200);
    expect(updated.body.data.sessionLeadershipStrategy).toBe("FIXED_LEAD");
    expect(updated.body.data.fixedLeadCoachId).toBe(context.coachOneId);
  });
});

// ─── targetCoHostCount Validation ─────────────────────────────────────────────

describe("targetCoHostCount validation", () => {
  it("rejects targetCoHostCount: 0 for multi-coach interaction types", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Invalid cohost count",
      eventTypeId: eventType.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "DIRECT",
      fixedLeadCoachId: context.coachOneId,
      targetCoHostCount: 0,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/targetCoHostCount must be at least 1/i);
  });

  it("accepts targetCoHostCount: 1 for multi-coach interaction types", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Valid cohost count 1",
      eventTypeId: eventType.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "DIRECT",
      fixedLeadCoachId: context.coachOneId,
      targetCoHostCount: 1,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.targetCoHostCount).toBe(1);
  });

  it("accepts targetCoHostCount: null (all available co-hosts join the session)", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Null cohost count",
      eventTypeId: eventType.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "DIRECT",
      fixedLeadCoachId: context.coachOneId,
      targetCoHostCount: null,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.targetCoHostCount).toBeNull();
  });

  it("accepts updating targetCoHostCount to a valid positive integer", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Cohost count update",
      eventTypeId: eventType.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "DIRECT",
      fixedLeadCoachId: context.coachOneId,
    });
    const eventId = created.body.data.id as string;

    const res = await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ targetCoHostCount: 3 });

    expect(res.status).toBe(200);
    expect(res.body.data.targetCoHostCount).toBe(3);
  });

  it("rejects updating targetCoHostCount to 0 on a multi-coach event", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Cohost count zero update",
      eventTypeId: eventType.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "DIRECT",
      fixedLeadCoachId: context.coachOneId,
      targetCoHostCount: 2,
    });
    const eventId = created.body.data.id as string;

    // The partial UpdateEventSchema only runs caps-based superRefine when interactionType
    // is included in the payload. Include it so the validator has caps context.
    const res = await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ interactionType: "MANY_TO_ONE", targetCoHostCount: 0 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/targetCoHostCount must be at least 1/i);
  });
});

// ─── showDescription Field ─────────────────────────────────────────────────────

describe("showDescription field", () => {
  it("defaults to false when not specified on creation", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.showDescription).toBe(false);
  });

  it("can be set to true on creation", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      showDescription: true,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.showDescription).toBe(true);
  });

  it("can be toggled via PATCH", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
    });
    const eventId = created.body.data.id as string;

    const res = await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ showDescription: true });

    expect(res.status).toBe(200);
    expect(res.body.data.showDescription).toBe(true);
  });

  it("is preserved when duplicating an event", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      showDescription: true,
    });
    const eventId = created.body.data.id as string;

    const res = await request(app)
      .post(`/api/events/${eventId}/duplicate`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(res.status).toBe(201);
    expect(res.body.data.showDescription).toBe(true);
  });
});

// ─── maxBookingWindowDays Field ───────────────────────────────────────────────

describe("maxBookingWindowDays field", () => {
  it("defaults to null when not specified on creation", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.maxBookingWindowDays).toBeNull();
  });

  it("can be set to a positive integer on creation", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      maxBookingWindowDays: 30,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.maxBookingWindowDays).toBe(30);
  });

  it("can be updated via PATCH", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
    });
    const eventId = created.body.data.id as string;

    const res = await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ maxBookingWindowDays: 60 });

    expect(res.status).toBe(200);
    expect(res.body.data.maxBookingWindowDays).toBe(60);
  });

  it("can be cleared back to null via PATCH", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      maxBookingWindowDays: 14,
    });
    const eventId = created.body.data.id as string;

    const res = await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ maxBookingWindowDays: null });

    expect(res.status).toBe(200);
    expect(res.body.data.maxBookingWindowDays).toBeNull();
  });

  it("is preserved when duplicating an event", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      maxBookingWindowDays: 90,
    });
    const eventId = created.body.data.id as string;

    const res = await request(app)
      .post(`/api/events/${eventId}/duplicate`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(res.status).toBe(201);
    expect(res.body.data.maxBookingWindowDays).toBe(90);
  });

  it("rejects 0 (must be at least 1)", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      maxBookingWindowDays: 0,
    });

    expect(res.status).toBe(400);
  });

  it("rejects negative values", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      maxBookingWindowDays: -5,
    });

    expect(res.status).toBe(400);
  });

  it("rejects values greater than 365", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      maxBookingWindowDays: 366,
    });

    expect(res.status).toBe(400);
  });
});

// ─── allowAnonymousBooking Field ─────────────────────────────────────────────

describe("allowAnonymousBooking field", () => {
  it("defaults to false when not specified on creation", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      interactionType: "ONE_TO_MANY",
      bookingMode: "FIXED_SLOTS",
      maxParticipantCount: 5,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.allowAnonymousBooking).toBe(false);
  });

  it("can be set to true for ONE_TO_MANY events", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      interactionType: "ONE_TO_MANY",
      bookingMode: "FIXED_SLOTS",
      meetingLinkSource: "EVENT_LOCATION",
      allowAnonymousBooking: true,
      maxParticipantCount: 5,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.allowAnonymousBooking).toBe(true);
  });

  it("rejects allowAnonymousBooking=true for ONE_TO_ONE events", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      interactionType: "ONE_TO_ONE",
      allowAnonymousBooking: true,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/ONE_TO_MANY/);
  });

  it("rejects allowAnonymousBooking=true alongside deferCoachReveal=true (mutual exclusivity)", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      interactionType: "ONE_TO_MANY",
      bookingMode: "FIXED_SLOTS",
      meetingLinkSource: "EVENT_LOCATION",
      deferCoachReveal: true,
      allowAnonymousBooking: true,
      maxParticipantCount: 5,
    });

    expect(res.status).toBe(400);
  });

  it("rejects allowAnonymousBooking=true when meetingLinkSource is not EVENT_LOCATION", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      interactionType: "ONE_TO_MANY",
      bookingMode: "FIXED_SLOTS",
      meetingLinkSource: "COACH_ISV",
      allowAnonymousBooking: true,
      maxParticipantCount: 5,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/event location/i);
  });

  it("rejects allowAnonymousBooking=true when locationValue is empty", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      interactionType: "ONE_TO_MANY",
      bookingMode: "FIXED_SLOTS",
      meetingLinkSource: "EVENT_LOCATION",
      allowAnonymousBooking: true,
      locationValue: "",
      maxParticipantCount: 5,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Location is required/i);
  });

  it("can be toggled via PATCH (before any bookings exist)", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      interactionType: "ONE_TO_MANY",
      bookingMode: "FIXED_SLOTS",
      maxParticipantCount: 5,
    });
    const eventId = created.body.data.id as string;

    const res = await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        interactionType: "ONE_TO_MANY",
        meetingLinkSource: "EVENT_LOCATION",
        allowAnonymousBooking: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.allowAnonymousBooking).toBe(true);
  });

  it("rejects toggle via PATCH once bookings exist (409)", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      interactionType: "ONE_TO_MANY",
      bookingMode: "FIXED_SLOTS",
      meetingLinkSource: "EVENT_LOCATION",
      allowAnonymousBooking: true,
      maxParticipantCount: 5,
      minimumNoticeMinutes: 0,
    });
    expect(created.status).toBe(201);
    const eventId = created.body.data.id as string;

    // Create a slot and a booking directly via Prisma so we skip notification infra
    const slotStart = getNextUtcWeekdayAt(1, 10, 0);
    const slot = await prisma.eventScheduleSlot.create({
      data: {
        eventId,
        startTime: slotStart,
        endTime: new Date(slotStart.getTime() + 1800 * 1000),
        capacity: 5,
      },
    });
    await prisma.booking.create({
      data: {
        studentName: "Anon Student",
        studentEmail: "anon@example.com",
        teamId: context.teamId,
        eventId,
        coachUserId: null,
        scheduleSlotId: slot.id,
        startTime: slotStart,
        endTime: new Date(slotStart.getTime() + 1800 * 1000),
        status: "CONFIRMED",
      },
    });

    const res = await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ allowAnonymousBooking: false });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/anonymous/i);
  });

  it("is preserved when duplicating an event", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      interactionType: "ONE_TO_MANY",
      bookingMode: "FIXED_SLOTS",
      meetingLinkSource: "EVENT_LOCATION",
      allowAnonymousBooking: true,
      maxParticipantCount: 5,
    });
    const eventId = created.body.data.id as string;

    const res = await request(app)
      .post(`/api/events/${eventId}/duplicate`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(res.status).toBe(201);
    expect(res.body.data.allowAnonymousBooking).toBe(true);
  });
});

// ─── Event Location Link Expiration & Reminder Configuration ────────────────
describe("Event location link expiration & reminder configuration", () => {
  it("defaults to null when not specified on creation", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const res = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.locationLinkExpiresAt).toBeNull();
    expect(res.body.data.locationLinkReminderDays).toBeNull();
  });

  it("can be set on creation when meetingLinkSource is EVENT_LOCATION and locationType is VIRTUAL", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 10);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Link Expiry Event",
      eventTypeId: eventType.body.data.id,
      locationType: "VIRTUAL",
      locationValue: "https://example.com/meeting",
      meetingLinkSource: "EVENT_LOCATION",
      locationLinkExpiresAt: expiresAt.toISOString(),
      locationLinkReminderDays: 3,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.locationLinkExpiresAt).toBeDefined();
    expect(new Date(res.body.data.locationLinkExpiresAt).toDateString()).toBe(expiresAt.toDateString());
    expect(res.body.data.locationLinkReminderDays).toBe(3);
  });

  it("rejects when locationLinkExpiresAt is set but locationLinkReminderDays is missing", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 10);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Missing Reminder Days",
      eventTypeId: eventType.body.data.id,
      locationType: "VIRTUAL",
      locationValue: "https://example.com/meeting",
      meetingLinkSource: "EVENT_LOCATION",
      locationLinkExpiresAt: expiresAt.toISOString(),
    });

    expect(res.status).toBe(400);
  });

  it("rejects when locationLinkReminderDays is set but locationLinkExpiresAt is missing", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Missing Expiration Date",
      eventTypeId: eventType.body.data.id,
      locationType: "VIRTUAL",
      locationValue: "https://example.com/meeting",
      meetingLinkSource: "EVENT_LOCATION",
      locationLinkReminderDays: 5,
    });

    expect(res.status).toBe(400);
  });

  it("rejects when locationLinkReminderDays is outside the 1-90 range", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 10);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Out of bounds Reminder Days",
      eventTypeId: eventType.body.data.id,
      locationType: "VIRTUAL",
      locationValue: "https://example.com/meeting",
      meetingLinkSource: "EVENT_LOCATION",
      locationLinkExpiresAt: expiresAt.toISOString(),
      locationLinkReminderDays: 95,
    });

    expect(res.status).toBe(400);
  });

  it("preserves expiration configuration when meetingLinkSource is updated away from EVENT_LOCATION (locationType stays VIRTUAL)", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 10);

    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Preserve Expiry Test Event",
      eventTypeId: eventType.body.data.id,
      locationType: "VIRTUAL",
      locationValue: "https://example.com/meeting",
      meetingLinkSource: "EVENT_LOCATION",
      locationLinkExpiresAt: expiresAt.toISOString(),
      locationLinkReminderDays: 3,
    });
    expect(created.status).toBe(201);
    const eventId = created.body.data.id;

    // Switching meetingLinkSource to COACH_ISV keeps locationType=VIRTUAL,
    // so expiry fields should be preserved (not nullified).
    const res = await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        meetingLinkSource: "COACH_ISV",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.locationLinkExpiresAt).not.toBeNull();
    expect(res.body.data.locationLinkReminderDays).toBe(3);
  });

  it("auto-nullifies expiration configuration when locationType is updated to IN_PERSON", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 10);

    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Auto Nullify On LocType Test",
      eventTypeId: eventType.body.data.id,
      locationType: "VIRTUAL",
      locationValue: "https://example.com/meeting",
      meetingLinkSource: "EVENT_LOCATION",
      locationLinkExpiresAt: expiresAt.toISOString(),
      locationLinkReminderDays: 3,
    });
    expect(created.status).toBe(201);
    const eventId = created.body.data.id;

    // Switching to IN_PERSON nullifies expiry because it's not VIRTUAL/CUSTOM.
    const res = await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        locationType: "IN_PERSON",
        locationValue: "123 Main St",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.locationLinkExpiresAt).toBeNull();
    expect(res.body.data.locationLinkReminderDays).toBeNull();
  });

  it("can be set when locationType is CUSTOM and meetingLinkSource is EVENT_LOCATION", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Custom Location Expiry Event",
      eventTypeId: eventType.body.data.id,
      locationType: "CUSTOM",
      locationValue: "Custom instructions here",
      meetingLinkSource: "EVENT_LOCATION",
      locationLinkExpiresAt: expiresAt.toISOString(),
      locationLinkReminderDays: 7,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.locationLinkReminderDays).toBe(7);
    expect(new Date(res.body.data.locationLinkExpiresAt).toDateString()).toBe(expiresAt.toDateString());
  });

  it("ignores expiration fields when locationType is IN_PERSON (service nullifies them)", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 10);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "In Person Expiry Ignored",
      eventTypeId: eventType.body.data.id,
      locationType: "IN_PERSON",
      locationValue: "123 Main St",
      meetingLinkSource: "EVENT_LOCATION",
      locationLinkExpiresAt: expiresAt.toISOString(),
      locationLinkReminderDays: 3,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.locationLinkExpiresAt).toBeNull();
    expect(res.body.data.locationLinkReminderDays).toBeNull();
  });

  it("rejects PATCH where only locationLinkExpiresAt is provided without locationLinkReminderDays", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
    });
    expect(created.status).toBe(201);
    const eventId = created.body.data.id;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 10);

    const res = await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ locationLinkExpiresAt: expiresAt.toISOString() });

    expect(res.status).toBe(400);
  });

  it("rejects PATCH where only locationLinkReminderDays is provided without locationLinkExpiresAt", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
    });
    expect(created.status).toBe(201);
    const eventId = created.body.data.id;

    const res = await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ locationLinkReminderDays: 7 });

    expect(res.status).toBe(400);
  });

  it("preserves expiration fields when event is duplicated", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Expiry Duplicate Source",
      eventTypeId: eventType.body.data.id,
      locationType: "VIRTUAL",
      locationValue: "https://example.com/meeting",
      meetingLinkSource: "EVENT_LOCATION",
      locationLinkExpiresAt: expiresAt.toISOString(),
      locationLinkReminderDays: 14,
    });
    expect(created.status).toBe(201);

    const duped = await request(app)
      .post(`/api/events/${created.body.data.id}/duplicate`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send();

    expect(duped.status).toBe(201);
    expect(duped.body.data.locationLinkReminderDays).toBe(14);
    expect(new Date(duped.body.data.locationLinkExpiresAt).toDateString()).toBe(expiresAt.toDateString());
  });

  it("nullifies expiration fields when locationType is changed to IN_PERSON via PATCH", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 20);

    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Location Change Nullify Test",
      eventTypeId: eventType.body.data.id,
      locationType: "VIRTUAL",
      locationValue: "https://example.com/meeting",
      meetingLinkSource: "EVENT_LOCATION",
      locationLinkExpiresAt: expiresAt.toISOString(),
      locationLinkReminderDays: 5,
    });
    expect(created.status).toBe(201);

    const res = await request(app)
      .patch(`/api/events/${created.body.data.id}`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ locationType: "IN_PERSON", locationValue: "456 Office Blvd" });

    expect(res.status).toBe(200);
    expect(res.body.data.locationLinkExpiresAt).toBeNull();
    expect(res.body.data.locationLinkReminderDays).toBeNull();
  });
});

// ─── MANY_TO_MANY Event Creation ──────────────────────────────────────────────

describe("MANY_TO_MANY event creation", () => {
  it("creates a MANY_TO_MANY event with correct participant fields and auto-derived leadership", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTM Workshop",
      eventTypeId: eventType.body.data.id,
      interactionType: "MANY_TO_MANY",
      assignmentStrategy: "ROUND_ROBIN",
      bookingMode: "FIXED_SLOTS",
      maxParticipantCount: 20,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.interactionType).toBe("MANY_TO_MANY");
    expect(res.body.data.sessionLeadershipStrategy).toBe("ROTATING_LEAD"); // auto-derived from ROUND_ROBIN
    expect(res.body.data.bookingMode).toBe("FIXED_SLOTS");
    expect(res.body.data.maxParticipantCount).toBe(20);
  });

  it("silently overrides bookingMode to FIXED_SLOTS for MANY_TO_MANY even if COACH_AVAILABILITY is sent", async () => {
    const eventType = await createEventType(context.superAdminToken);

    // The schema does not block MANY_TO_MANY + COACH_AVAILABILITY (only ONE_TO_MANY has that check).
    // The service's resolveEventSchedulingConfig hard-locks all multipleParticipants types to FIXED_SLOTS.
    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTM Auto Fixed Slots",
      eventTypeId: eventType.body.data.id,
      interactionType: "MANY_TO_MANY",
      assignmentStrategy: "ROUND_ROBIN",
      bookingMode: "COACH_AVAILABILITY", // service will override this
      maxParticipantCount: 10,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.bookingMode).toBe("FIXED_SLOTS");
  });

  it("creates a MANY_TO_MANY event with DIRECT strategy and targetCoHostCount", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTM Direct with cohost cap",
      eventTypeId: eventType.body.data.id,
      interactionType: "MANY_TO_MANY",
      assignmentStrategy: "DIRECT",
      bookingMode: "FIXED_SLOTS",
      fixedLeadCoachId: context.coachOneId,
      targetCoHostCount: 2,
      maxParticipantCount: 30,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.sessionLeadershipStrategy).toBe("FIXED_LEAD"); // auto-derived from DIRECT
    expect(res.body.data.fixedLeadCoachId).toBe(context.coachOneId);
    expect(res.body.data.targetCoHostCount).toBe(2);
    expect(res.body.data.maxParticipantCount).toBe(30);
  });
});

// ─── Event Schema Validation Rejections ──────────────────────────────────────

describe("Event schema validation rejections", () => {
  it("rejects ONE_TO_MANY with ROUND_ROBIN assignment (single-coach group sessions only allow DIRECT)", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      interactionType: "ONE_TO_MANY",
      assignmentStrategy: "ROUND_ROBIN",
      bookingMode: "FIXED_SLOTS",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Single-coach group sessions only support DIRECT/i);
  });

  it("rejects ONE_TO_MANY with COACH_AVAILABILITY booking mode (must use FIXED_SLOTS)", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      interactionType: "ONE_TO_MANY",
      assignmentStrategy: "DIRECT",
      bookingMode: "COACH_AVAILABILITY",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/FIXED_SLOTS/i);
  });

  it("rejects ONE_TO_ONE with maxParticipantCount greater than 1", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      interactionType: "ONE_TO_ONE",
      maxParticipantCount: 5,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/only supports 1 participant/i);
  });

  it("rejects FIXED_LEAD sessionLeadershipStrategy without a fixedLeadCoachId (schema-level)", async () => {
    const eventType = await createEventType(context.superAdminToken);

    // For multi-coach types, the schema checks: FIXED_LEAD + !fixedLeadCoachId → error.
    const res = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "DIRECT",
      sessionLeadershipStrategy: "FIXED_LEAD",
      // fixedLeadCoachId intentionally absent
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/FIXED_LEAD strategy requires a fixed lead coach/i);
  });

  it("rejects non-SINGLE_COACH leadership strategy for single-coach interaction types (ONE_TO_ONE)", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      interactionType: "ONE_TO_ONE",
      sessionLeadershipStrategy: "ROTATING_LEAD",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Only SINGLE_COACH leadership is supported/i);
  });

  it("rejects non-SINGLE_COACH leadership strategy for ONE_TO_MANY", async () => {
    const eventType = await createEventType(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      interactionType: "ONE_TO_MANY",
      assignmentStrategy: "DIRECT",
      bookingMode: "FIXED_SLOTS",
      sessionLeadershipStrategy: "FIXED_LEAD",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Only SINGLE_COACH leadership is supported/i);
  });

  it("rejects targetCoHostCount with a negative value (caught by base nonnegative() schema rule)", async () => {
    const eventType = await createEventType(context.superAdminToken);

    // -1 is caught by z.coerce.number().int().nonnegative() before the superRefine runs.
    // The Zod error message for nonnegative() violation is "Too small: expected number to be >=0".
    const res = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "DIRECT",
      fixedLeadCoachId: context.coachOneId,
      targetCoHostCount: -1,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Too small/i);
  });
});

// ─────────────────────────────────────────────────────────────
// Recurrence — slot creation
// ─────────────────────────────────────────────────────────────

describe("Recurrence — slot creation", () => {
  let eventId: string;
  let eventTypeId: string;

  beforeAll(async () => {
    const eventType = await createEventType(context.superAdminToken, {
      key: `recurrence-offering-${Date.now()}`,
      name: "Recurrence Offering",
    });
    eventTypeId = eventType.body.data.id;

    // Unrestricted event so all day/time slots are valid
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Recurrence Test Event",
      eventTypeId: eventTypeId,
      bookingMode: "FIXED_SLOTS",
    });
    eventId = event.body.data.id;
  });

  afterEach(async () => {
    // Clean up slots between tests so startTime uniqueness constraint doesn't collide
    await prisma.eventScheduleSlot.deleteMany({ where: { eventId } });
  });

  it("WEEKLY recurrence with occurrences: 3 creates exactly 3 slots sharing the same recurrenceGroupId", async () => {
    const start = getNextUtcWeekdayAt(1, 10, 0); // next Monday 10:00
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const res = await request(app)
      .post(`/api/events/${eventId}/schedule-slots`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        capacity: 5,
        recurrence: { frequency: "WEEKLY", occurrences: 3 },
      });

    expect(res.status).toBe(201);

    const listRes = await request(app)
      .get(`/api/events/${eventId}/schedule-slots`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(listRes.status).toBe(200);
    const slots = listRes.body.data.slots;
    expect(slots).toHaveLength(3);

    const groupId = slots[0].recurrenceGroupId;
    expect(typeof groupId).toBe("string");
    expect(slots.every((s: any) => s.recurrenceGroupId === groupId)).toBe(true);
  });

  it("BI_WEEKLY recurrence: second slot is exactly 14 days after the first", async () => {
    const start = getNextUtcWeekdayAt(2, 11, 0); // next Tuesday 11:00
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const res = await request(app)
      .post(`/api/events/${eventId}/schedule-slots`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        capacity: 5,
        recurrence: { frequency: "BI_WEEKLY", occurrences: 2 },
      });

    expect(res.status).toBe(201);

    const listRes = await request(app)
      .get(`/api/events/${eventId}/schedule-slots`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    const slots = listRes.body.data.slots.sort(
      (a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
    expect(slots).toHaveLength(2);

    const diffMs = new Date(slots[1].startTime).getTime() - new Date(slots[0].startTime).getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(14);
  });

  it("rejects occurrences: 51 (exceeds schema max of 50)", async () => {
    const start = getNextUtcWeekdayAt(3, 9, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const res = await request(app)
      .post(`/api/events/${eventId}/schedule-slots`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        recurrence: { frequency: "WEEKLY", occurrences: 51 },
      });

    expect(res.status).toBe(400);
  });

  it("occurrences: 1 creates exactly 1 slot with a non-null recurrenceGroupId", async () => {
    const start = getNextUtcWeekdayAt(4, 14, 0); // Thursday 14:00
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const res = await request(app)
      .post(`/api/events/${eventId}/schedule-slots`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        recurrence: { frequency: "WEEKLY", occurrences: 1 },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.recurrenceGroupId).not.toBeNull();

    const listRes = await request(app)
      .get(`/api/events/${eventId}/schedule-slots`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`);

    expect(listRes.body.data.slots).toHaveLength(1);
  });

  it("rejects an invalid frequency value (schema validation)", async () => {
    const start = getNextUtcWeekdayAt(5, 9, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const res = await request(app)
      .post(`/api/events/${eventId}/schedule-slots`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        recurrence: { frequency: "DAILY", occurrences: 3 },
      });

    expect(res.status).toBe(400);
  });
});

describe("Deferred Coach Reveal", () => {
  let eventTypeId: string;
  let deferredEventId: string;
  let slotId: string;

  beforeAll(async () => {
    const eventType = await createEventType(context.superAdminToken, {
      key: `deferred-reveal-offering-${Date.now()}`,
      name: "Deferred Reveal Offering",
    });
    eventTypeId = eventType.body.data.id;

    // Assign coachOne to team so they can be assigned to event
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: context.teamId, userId: context.coachOneId } },
      update: { isActive: true },
      create: { teamId: context.teamId, userId: context.coachOneId, isActive: true },
    });

    const event = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Deferred Reveal Event",
      eventTypeId,
      interactionType: "ONE_TO_MANY",
      bookingMode: "FIXED_SLOTS",
      deferCoachReveal: true,
      maxParticipantCount: 5,
    });
    expect(event.status).toBe(201);
    deferredEventId = event.body.data.id;
    expect(event.body.data.deferCoachReveal).toBe(true);

    // Assign coach to event
    const putRes = await request(app)
      .put(`/api/events/${deferredEventId}/coaches`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ coaches: [{ userId: context.coachOneId }] });
    expect(putRes.status).toBe(200);
  });

  it("creates a slot for the deferred reveal event", async () => {
    const start = getNextUtcWeekdayAt(3, 14, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const res = await request(app)
      .post(`/api/events/${deferredEventId}/schedule-slots`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ startTime: start.toISOString(), endTime: end.toISOString(), capacity: 5 });

    expect(res.status).toBe(201);
    slotId = res.body.data.id;
  });

  it("POST /reveal with no coach assigned returns 400", async () => {
    const res = await request(app)
      .post(`/api/events/${deferredEventId}/schedule-slots/${slotId}/reveal`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/No coach assigned/);
  });

  it("POST /reveal with explicit coachUserId returns 200 and sets coachRevealSentAt", async () => {
    const res = await request(app)
      .post(`/api/events/${deferredEventId}/schedule-slots/${slotId}/reveal`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ coachUserId: context.coachOneId });

    expect(res.status).toBe(200);
    expect(res.body.data.coachRevealSentAt).not.toBeNull();
    expect(res.body.data.assignedCoachId).toBe(context.coachOneId);
  });

  it("POST /reveal again returns 409 (already sent)", async () => {
    const res = await request(app)
      .post(`/api/events/${deferredEventId}/schedule-slots/${slotId}/reveal`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ coachUserId: context.coachOneId });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already been sent/);
  });

  it("POST /reveal on a non-deferred event returns 400", async () => {
    const otherEventType = await createEventType(context.superAdminToken);
    const otherEvent = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: otherEventType.body.data.id,
      interactionType: "ONE_TO_ONE",
    });
    const otherEventId = otherEvent.body.data.id;

    const start = getNextUtcWeekdayAt(4, 15, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const slotRes = await request(app)
      .post(`/api/events/${otherEventId}/schedule-slots`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ startTime: start.toISOString(), endTime: end.toISOString() });
    const otherSlotId = slotRes.body.data.id;

    const res = await request(app)
      .post(`/api/events/${otherEventId}/schedule-slots/${otherSlotId}/reveal`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ coachUserId: context.coachOneId });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/does not use deferred coach reveal/);
  });

  it("COACH role POST /reveal for an event they are assigned to returns 200", async () => {
    // Create a new slot to avoid 409 collision
    const start = getNextUtcWeekdayAt(3, 15, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const slotRes = await request(app)
      .post(`/api/events/${deferredEventId}/schedule-slots`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ startTime: start.toISOString(), endTime: end.toISOString(), capacity: 5 });
    expect(slotRes.status).toBe(201);
    const newSlotId = slotRes.body.data.id;

    const res = await request(app)
      .post(`/api/events/${deferredEventId}/schedule-slots/${newSlotId}/reveal`)
      .set("Authorization", `Bearer ${context.coachToken}`)
      .send({ coachUserId: context.coachOneId });

    expect(res.status).toBe(200);
    expect(res.body.data.coachRevealSentAt).not.toBeNull();
  });

  it("COACH role POST /reveal for an event they are NOT assigned to returns 403", async () => {
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Deferred Reveal Event Unassigned",
      eventTypeId,
      interactionType: "ONE_TO_MANY",
      bookingMode: "FIXED_SLOTS",
      deferCoachReveal: true,
      maxParticipantCount: 5,
    });
    expect(event.status).toBe(201);
    const unassignedEventId = event.body.data.id;

    const start = getNextUtcWeekdayAt(3, 16, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const slotRes = await request(app)
      .post(`/api/events/${unassignedEventId}/schedule-slots`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ startTime: start.toISOString(), endTime: end.toISOString(), capacity: 5 });
    expect(slotRes.status).toBe(201);
    const unassignedSlotId = slotRes.body.data.id;

    const res = await request(app)
      .post(`/api/events/${unassignedEventId}/schedule-slots/${unassignedSlotId}/reveal`)
      .set("Authorization", `Bearer ${context.coachToken}`)
      .send({ coachUserId: context.coachOneId });

    expect(res.status).toBe(403);
  });

  it("COACH cannot nominate another user via payload.coachUserId (403)", async () => {
    const start = getNextUtcWeekdayAt(3, 17, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const slotRes = await request(app)
      .post(`/api/events/${deferredEventId}/schedule-slots`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ startTime: start.toISOString(), endTime: end.toISOString(), capacity: 5 });
    expect(slotRes.status).toBe(201);
    const newSlotId = slotRes.body.data.id;

    const res = await request(app)
      .post(`/api/events/${deferredEventId}/schedule-slots/${newSlotId}/reveal`)
      .set("Authorization", `Bearer ${context.coachToken}`)
      .send({ coachUserId: context.coachTwoId });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/may only reveal themselves/);
  });

  it("rejects reveal when payload.coachUserId is not in the event's coach pool (400)", async () => {
    const start = getNextUtcWeekdayAt(3, 18, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const slotRes = await request(app)
      .post(`/api/events/${deferredEventId}/schedule-slots`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ startTime: start.toISOString(), endTime: end.toISOString(), capacity: 5 });
    expect(slotRes.status).toBe(201);
    const newSlotId = slotRes.body.data.id;

    // Admin calls reveal with a coach who is NOT in the event's coach pool
    const res = await request(app)
      .post(`/api/events/${deferredEventId}/schedule-slots/${newSlotId}/reveal`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({ coachUserId: context.coachTwoId });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not in this event's coach pool/);
  });

  it("schema rejects deferCoachReveal=true for ONE_TO_ONE event", async () => {
    const eventType = await createEventType(context.superAdminToken);
    const res = await createEvent(context.teamId, context.teamAdminToken, {
      eventTypeId: eventType.body.data.id,
      interactionType: "ONE_TO_ONE",
      deferCoachReveal: true,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/ONE_TO_MANY/);
  });
});
