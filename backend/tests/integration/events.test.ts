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

    const event = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Offering Usage Event",
      offeringId: offId,
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

    await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offId,
    });

    const res = await request(app)
      .delete(`/api/event-offerings/${offId}`)
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
    expect(
      res.body.data.interactionTypes.map((t: { key: string }) => t.key),
    ).toEqual(expect.arrayContaining(["ONE_TO_ONE", "ONE_TO_MANY", "MANY_TO_ONE", "MANY_TO_MANY"]));
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
    const offering = await createOffering(context.superAdminToken, {
      key: uniqueValue("career-coaching"),
      name: "Career Coaching",
    });

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Career Coaching Session",
      offeringId: offering.body.data.id,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Career Coaching Session");
    expect(res.body.data.offering.id).toBe(offering.body.data.id);
    expect(res.body.data.interactionType).toBe("ONE_TO_ONE");
  });

  it("defaults to DIRECT assignment when the event does not choose a strategy", async () => {
    const offering = await createOffering(context.superAdminToken, {
      key: uniqueValue("round-robin-offering"),
      name: "Round Robin Offering",
    });

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Configured Event",
      offeringId: offering.body.data.id,
      interactionType: "ONE_TO_MANY",
      assignmentStrategy: undefined,
      bookingMode: "FIXED_SLOTS",
      minParticipantCount: 2,
      maxParticipantCount: 8,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.assignmentStrategy).toBe("DIRECT");
    expect(res.body.data.bookingMode).toBe("FIXED_SLOTS");
    expect(res.body.data.minParticipantCount).toBe(2);
    expect(res.body.data.maxParticipantCount).toBe(8);
  });

  it("forbids a TEAM_ADMIN from managing another team", async () => {
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.otherTeamAdminToken, {
      name: "Unauthorized Event",
      offeringId: offering.body.data.id,
    });

    expect(res.status).toBe(403);
  });

  it("lists team events with pagination", async () => {
    const offering = await createOffering(context.superAdminToken, {
      key: uniqueValue("list-offering"),
      name: "List Offering",
    });
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Listable Event",
      offeringId: offering.body.data.id,
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
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Readable Event",
      offeringId: offering.body.data.id,
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
    const offering = await createOffering(context.superAdminToken, {
      key: uniqueValue("otm-general-update"),
    });
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "OTM General Details Event",
      offeringId: offering.body.data.id,
      interactionType: "ONE_TO_MANY",
      assignmentStrategy: "DIRECT",
      bookingMode: "FIXED_SLOTS",
      allowedWeekdays: [0, 1, 2, 3, 4, 5, 6],
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
    const offering = await createOffering(context.superAdminToken, {
      key: uniqueValue("mto-general-update"),
    });
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTO General Details Event",
      offeringId: offering.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "ROUND_ROBIN",
      minCoachCount: 2,
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
    const offering = await createOffering(context.superAdminToken, {
      key: uniqueValue("mtm-general-update"),
    });
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTM General Details Event",
      offeringId: offering.body.data.id,
      interactionType: "MANY_TO_MANY",
      assignmentStrategy: "ROUND_ROBIN",
      minCoachCount: 2,
      bookingMode: "FIXED_SLOTS",
      allowedWeekdays: [0, 1, 2, 3, 4, 5, 6],
      minParticipantCount: 1,
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
    const offering = await createOffering(context.superAdminToken);
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Deletable Event",
      offeringId: offering.body.data.id,
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
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Event with Booking",
      offeringId: offering.body.data.id,
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
    const offering = await createOffering(context.superAdminToken);
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Deactivatable Event",
      offeringId: offering.body.data.id,
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
    const offering = await createOffering(context.superAdminToken);
    const originalEvent = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Original Event",
      offeringId: offering.body.data.id,
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
    const offering = await createOffering(context.superAdminToken);

    // Create a MANY_TO_ONE event via DIRECT strategy
    // In our system, MANY_TO_ONE + DIRECT => FIXED_LEAD
    const originalEvent = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTO Direct Event",
      offeringId: offering.body.data.id,
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
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Fixed Lead Event",
      offeringId: offering.body.data.id,
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
    const offering = await createOffering(context.superAdminToken, {
      key: uniqueValue("fixed-slot-offering"),
      name: "Fixed Slot Offering",
    });

    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Advanced Scheduling Event",
      offeringId: offering.body.data.id,
      interactionType: "ONE_TO_MANY",
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
        allowedWeekdays: [],
        minimumNoticeMinutes: 60,
      });

    // ONE_TO_MANY events are permanently locked to FIXED_SLOTS — bookingMode cannot be changed.
    expect(updated.status).toBe(200);
    expect(updated.body.data.bookingMode).toBe("FIXED_SLOTS");
    expect(updated.body.data.allowedWeekdays).toEqual([]);
    expect(updated.body.data.minimumNoticeMinutes).toBe(60);
  });

  it("creates, updates, lists, and deletes predefined schedule slots", async () => {
    const offering = await createOffering(context.superAdminToken, {
      key: uniqueValue("slot-offering"),
      name: "Slot Offering",
    });
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Slot Managed Event",
      offeringId: offering.body.data.id,
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
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
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
    const offering = await createOffering(context.superAdminToken, {
      key: uniqueValue("coach-offering"),
      name: "Coach Offering",
    });
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Coached Event",
      offeringId: offering.body.data.id,
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
    const offering = await createOffering(context.superAdminToken, {
      key: uniqueValue("rr-offering"),
      name: "Round Robin Offering",
    });
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Round Robin Event",
      offeringId: offering.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "ROUND_ROBIN",
      minCoachCount: 2,
    });

    const res = await request(app)
      .put(`/api/events/${event.body.data.id}/coaches`)
      .set("Authorization", `Bearer ${context.teamAdminToken}`)
      .send({
        coaches: [{ userId: context.coachOneId, coachOrder: 1 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/ROUND_ROBIN events require at least two coaches/i);
  });

  it("removes an assigned coach", async () => {
    const offering = await createOffering(context.superAdminToken, {
      key: uniqueValue("remove-coach-offering"),
      name: "Remove Coach Offering",
    });
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Coach Removal Event",
      offeringId: offering.body.data.id,
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
    const offering = await createOffering(context.superAdminToken);
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "ROUND_ROBIN",
      minCoachCount: 2,
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
    expect(res.body.message).toMatch(/ROUND_ROBIN events require at least two coaches/i);
  });

  it("rejects updating strategy to ROUND_ROBIN if event has fewer than two coaches", async () => {
    const offering = await createOffering(context.superAdminToken);
    // MANY_TO_ONE + DIRECT → FIXED_LEAD leadership, which requires a fixedLeadCoachId
    const event = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
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
    // Service-level check fires (schema minCoachCount check doesn't fire when
    // minCoachCount is omitted from the PATCH body, as there is no default).
    expect(res.body.message).toMatch(/ROUND_ROBIN events require at least two coaches/i);
  });
});

// ─── Leadership Auto-Derivation ───────────────────────────────────────────────

describe("Leadership auto-derivation (derivesLeadershipFromAssignment types)", () => {
  it("MANY_TO_ONE + DIRECT derives sessionLeadershipStrategy to FIXED_LEAD (no explicit leadership in payload)", async () => {
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTO Direct — auto FIXED_LEAD",
      offeringId: offering.body.data.id,
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
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTO Round Robin — auto ROTATING_LEAD",
      offeringId: offering.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "ROUND_ROBIN",
      minCoachCount: 2,
      // sessionLeadershipStrategy intentionally absent — must be auto-derived
    });

    expect(res.status).toBe(201);
    expect(res.body.data.sessionLeadershipStrategy).toBe("ROTATING_LEAD");
    expect(res.body.data.fixedLeadCoachId).toBeNull();
  });

  it("MANY_TO_MANY + DIRECT derives sessionLeadershipStrategy to FIXED_LEAD", async () => {
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTM Direct — auto FIXED_LEAD",
      offeringId: offering.body.data.id,
      interactionType: "MANY_TO_MANY",
      assignmentStrategy: "DIRECT",
      bookingMode: "FIXED_SLOTS",
      fixedLeadCoachId: context.coachOneId,
      minParticipantCount: 1,
      maxParticipantCount: 10,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.sessionLeadershipStrategy).toBe("FIXED_LEAD");
    expect(res.body.data.fixedLeadCoachId).toBe(context.coachOneId);
    expect(res.body.data.bookingMode).toBe("FIXED_SLOTS");
  });

  it("MANY_TO_MANY + ROUND_ROBIN derives sessionLeadershipStrategy to ROTATING_LEAD", async () => {
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTM Round Robin — auto ROTATING_LEAD",
      offeringId: offering.body.data.id,
      interactionType: "MANY_TO_MANY",
      assignmentStrategy: "ROUND_ROBIN",
      bookingMode: "FIXED_SLOTS",
      minCoachCount: 2,
      minParticipantCount: 1,
      maxParticipantCount: 10,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.sessionLeadershipStrategy).toBe("ROTATING_LEAD");
    expect(res.body.data.fixedLeadCoachId).toBeNull();
    expect(res.body.data.bookingMode).toBe("FIXED_SLOTS");
  });

  it("overrides user-provided sessionLeadershipStrategy for derivesLeadershipFromAssignment types — reform always wins", async () => {
    const offering = await createOffering(context.superAdminToken);

    // User explicitly provides ROTATING_LEAD for a DIRECT event.
    // The reform (step 4) must override it to FIXED_LEAD because assignmentStrategy = DIRECT.
    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTO reform override test",
      offeringId: offering.body.data.id,
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
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTO Direct — no lead coach",
      offeringId: offering.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "DIRECT",
      // fixedLeadCoachId intentionally absent: reform derives FIXED_LEAD,
      // then validateEventConfiguration rejects because fixedLeadCoachId is null.
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/FIXED_LEAD events require a fixedLeadCoachId/i);
  });

  it("re-derives sessionLeadershipStrategy when assignmentStrategy is updated on a MANY_TO_ONE event", async () => {
    const offering = await createOffering(context.superAdminToken);

    // 1. Create with DIRECT → FIXED_LEAD
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTO strategy update",
      offeringId: offering.body.data.id,
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
      .send({ assignmentStrategy: "ROUND_ROBIN", minCoachCount: 2 });

    expect(updated.status).toBe(200);
    expect(updated.body.data.sessionLeadershipStrategy).toBe("ROTATING_LEAD");
  });

  it("re-derives sessionLeadershipStrategy when assignmentStrategy is updated on a MANY_TO_MANY event", async () => {
    const offering = await createOffering(context.superAdminToken);

    // 1. Create with ROUND_ROBIN → ROTATING_LEAD
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTM strategy update",
      offeringId: offering.body.data.id,
      interactionType: "MANY_TO_MANY",
      assignmentStrategy: "ROUND_ROBIN",
      bookingMode: "FIXED_SLOTS",
      minCoachCount: 2,
      minParticipantCount: 1,
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
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Invalid cohost count",
      offeringId: offering.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "DIRECT",
      fixedLeadCoachId: context.coachOneId,
      targetCoHostCount: 0,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/targetCoHostCount must be at least 1/i);
  });

  it("accepts targetCoHostCount: 1 for multi-coach interaction types", async () => {
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Valid cohost count 1",
      offeringId: offering.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "DIRECT",
      fixedLeadCoachId: context.coachOneId,
      targetCoHostCount: 1,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.targetCoHostCount).toBe(1);
  });

  it("accepts targetCoHostCount: null (all available co-hosts join the session)", async () => {
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Null cohost count",
      offeringId: offering.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "DIRECT",
      fixedLeadCoachId: context.coachOneId,
      targetCoHostCount: null,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.targetCoHostCount).toBeNull();
  });

  it("accepts updating targetCoHostCount to a valid positive integer", async () => {
    const offering = await createOffering(context.superAdminToken);
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Cohost count update",
      offeringId: offering.body.data.id,
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
    const offering = await createOffering(context.superAdminToken);
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      name: "Cohost count zero update",
      offeringId: offering.body.data.id,
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
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.showDescription).toBe(false);
  });

  it("can be set to true on creation", async () => {
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
      showDescription: true,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.showDescription).toBe(true);
  });

  it("can be toggled via PATCH", async () => {
    const offering = await createOffering(context.superAdminToken);
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
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
    const offering = await createOffering(context.superAdminToken);
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
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
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.maxBookingWindowDays).toBeNull();
  });

  it("can be set to a positive integer on creation", async () => {
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
      maxBookingWindowDays: 30,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.maxBookingWindowDays).toBe(30);
  });

  it("can be updated via PATCH", async () => {
    const offering = await createOffering(context.superAdminToken);
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
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
    const offering = await createOffering(context.superAdminToken);
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
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
    const offering = await createOffering(context.superAdminToken);
    const created = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
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
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
      maxBookingWindowDays: 0,
    });

    expect(res.status).toBe(400);
  });

  it("rejects negative values", async () => {
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
      maxBookingWindowDays: -5,
    });

    expect(res.status).toBe(400);
  });

  it("rejects values greater than 365", async () => {
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
      maxBookingWindowDays: 366,
    });

    expect(res.status).toBe(400);
  });
});

// ─── MANY_TO_MANY Event Creation ──────────────────────────────────────────────

describe("MANY_TO_MANY event creation", () => {
  it("creates a MANY_TO_MANY event with correct participant fields and auto-derived leadership", async () => {
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTM Workshop",
      offeringId: offering.body.data.id,
      interactionType: "MANY_TO_MANY",
      assignmentStrategy: "ROUND_ROBIN",
      bookingMode: "FIXED_SLOTS",
      minCoachCount: 2,
      minParticipantCount: 2,
      maxParticipantCount: 20,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.interactionType).toBe("MANY_TO_MANY");
    expect(res.body.data.sessionLeadershipStrategy).toBe("ROTATING_LEAD"); // auto-derived from ROUND_ROBIN
    expect(res.body.data.bookingMode).toBe("FIXED_SLOTS");
    expect(res.body.data.minParticipantCount).toBe(2);
    expect(res.body.data.maxParticipantCount).toBe(20);
  });

  it("silently overrides bookingMode to FIXED_SLOTS for MANY_TO_MANY even if COACH_AVAILABILITY is sent", async () => {
    const offering = await createOffering(context.superAdminToken);

    // The schema does not block MANY_TO_MANY + COACH_AVAILABILITY (only ONE_TO_MANY has that check).
    // The service's resolveEventSchedulingConfig hard-locks all multipleParticipants types to FIXED_SLOTS.
    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTM Auto Fixed Slots",
      offeringId: offering.body.data.id,
      interactionType: "MANY_TO_MANY",
      assignmentStrategy: "ROUND_ROBIN",
      bookingMode: "COACH_AVAILABILITY", // service will override this
      minCoachCount: 2,
      minParticipantCount: 1,
      maxParticipantCount: 10,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.bookingMode).toBe("FIXED_SLOTS");
  });

  it("creates a MANY_TO_MANY event with DIRECT strategy and targetCoHostCount", async () => {
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      name: "MTM Direct with cohost cap",
      offeringId: offering.body.data.id,
      interactionType: "MANY_TO_MANY",
      assignmentStrategy: "DIRECT",
      bookingMode: "FIXED_SLOTS",
      fixedLeadCoachId: context.coachOneId,
      targetCoHostCount: 2,
      minParticipantCount: 5,
      maxParticipantCount: 30,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.sessionLeadershipStrategy).toBe("FIXED_LEAD"); // auto-derived from DIRECT
    expect(res.body.data.fixedLeadCoachId).toBe(context.coachOneId);
    expect(res.body.data.targetCoHostCount).toBe(2);
    expect(res.body.data.minParticipantCount).toBe(5);
    expect(res.body.data.maxParticipantCount).toBe(30);
  });
});

// ─── Event Schema Validation Rejections ──────────────────────────────────────

describe("Event schema validation rejections", () => {
  it("rejects ONE_TO_MANY with ROUND_ROBIN assignment (single-coach group sessions only allow DIRECT)", async () => {
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
      interactionType: "ONE_TO_MANY",
      assignmentStrategy: "ROUND_ROBIN",
      bookingMode: "FIXED_SLOTS",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Single-coach group sessions only support DIRECT/i);
  });

  it("rejects ONE_TO_MANY with COACH_AVAILABILITY booking mode (must use FIXED_SLOTS)", async () => {
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
      interactionType: "ONE_TO_MANY",
      assignmentStrategy: "DIRECT",
      bookingMode: "COACH_AVAILABILITY",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/FIXED_SLOTS/i);
  });

  it("rejects ONE_TO_ONE with maxParticipantCount greater than 1", async () => {
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
      interactionType: "ONE_TO_ONE",
      maxParticipantCount: 5,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/only supports 1 participant/i);
  });

  it("rejects an event where maxCoachCount is less than minCoachCount", async () => {
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "ROUND_ROBIN",
      minCoachCount: 3,
      maxCoachCount: 2,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/maxCoachCount cannot be less than minCoachCount/i);
  });

  it("rejects ROUND_ROBIN assignment when minCoachCount is less than 2", async () => {
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "ROUND_ROBIN",
      minCoachCount: 1,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/ROUND_ROBIN assignment requires at least 2 coaches/i);
  });

  it("rejects FIXED_LEAD sessionLeadershipStrategy without a fixedLeadCoachId (schema-level)", async () => {
    const offering = await createOffering(context.superAdminToken);

    // For multi-coach types, the schema checks: FIXED_LEAD + !fixedLeadCoachId → error.
    const res = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "DIRECT",
      sessionLeadershipStrategy: "FIXED_LEAD",
      // fixedLeadCoachId intentionally absent
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/FIXED_LEAD strategy requires a fixed lead coach/i);
  });

  it("rejects non-SINGLE_COACH leadership strategy for single-coach interaction types (ONE_TO_ONE)", async () => {
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
      interactionType: "ONE_TO_ONE",
      sessionLeadershipStrategy: "ROTATING_LEAD",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Only SINGLE_COACH leadership is supported/i);
  });

  it("rejects non-SINGLE_COACH leadership strategy for ONE_TO_MANY", async () => {
    const offering = await createOffering(context.superAdminToken);

    const res = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
      interactionType: "ONE_TO_MANY",
      assignmentStrategy: "DIRECT",
      bookingMode: "FIXED_SLOTS",
      sessionLeadershipStrategy: "FIXED_LEAD",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Only SINGLE_COACH leadership is supported/i);
  });

  it("rejects targetCoHostCount with a negative value (caught by base nonnegative() schema rule)", async () => {
    const offering = await createOffering(context.superAdminToken);

    // -1 is caught by z.coerce.number().int().nonnegative() before the superRefine runs.
    // The Zod error message for nonnegative() violation is "Too small: expected number to be >=0".
    const res = await createEvent(context.teamId, context.teamAdminToken, {
      offeringId: offering.body.data.id,
      interactionType: "MANY_TO_ONE",
      assignmentStrategy: "DIRECT",
      fixedLeadCoachId: context.coachOneId,
      targetCoHostCount: -1,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Too small/i);
  });
});
