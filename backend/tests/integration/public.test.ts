import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/shared/db/prisma";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";

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

let superAdminToken: string;
let teamAdminId: string;
let coachId: string;
let teamId: string;
let teamSlug: string;
let eventId: string;
let eventSlug: string;
let coachSlug: string;
let groupSlugVal: string;

beforeAll(async () => {
  await clearTables();

  const admin = await bootstrapAdmin("super@public.com", "Admin1234");
  superAdminToken = admin.token;

  // Create Offering
  const eventTypeRes = await request(app)
    .post("/api/event-types")
    .set("Authorization", `Bearer ${superAdminToken}`)
    .send({
      key: "public-offering",
      name: "Public Offering",
      description: "Offering for public",
      sortOrder: 1,
      isActive: true,
    });
  const eventTypeId = eventTypeRes.body.data.id;

  const interactionTypeId = "ONE_TO_ONE";

  const teamAdmin = await registerUser(superAdminToken, {
    firstName: "Team",
    lastName: "Admin",
    email: "teamadmin@public.com",
    password: "TeamAdmin1234",
    role: "TEAM_ADMIN",
  });
  teamAdminId = teamAdmin.id;

  const coach = await registerUser(superAdminToken, {
    firstName: "Public",
    lastName: "Coach",
    email: "coach@public.com",
    password: "CoachPass1234",
    role: "COACH",
  });
  coachId = coach.id;
  coachSlug = coach.publicBookingSlug ?? "";

  // Create a team
  const teamRes = await request(app)
    .post("/api/teams")
    .set("Authorization", `Bearer ${superAdminToken}`)
    .send({ name: "Public Team", description: "Discoverable team", teamLeadId: teamAdminId });
  teamId = teamRes.body.data.id;
  teamSlug = teamRes.body.data.publicBookingSlug;

  await request(app)
    .post(`/api/teams/${teamId}/members`)
    .set("Authorization", `Bearer ${superAdminToken}`)
    .send({ userId: coachId });

  // Create an event via API
  const eventRes = await request(app)
    .post(`/api/teams/${teamId}/events`)
    .set("Authorization", `Bearer ${superAdminToken}`)
    .send({
      name: "Public Intro",
      description: "Intro session",
      durationSeconds: 1800,
      locationType: "VIRTUAL",
      locationValue: "https://zoom.us/j/public-session",
      isActive: true,
      eventTypeId: eventTypeId,
      interactionType: interactionTypeId,
      coCoachUserIds: [coachId],
    });

  eventId = eventRes.body.data.id;
  eventSlug = eventRes.body.data.publicBookingSlug;

  await request(app)
    .put(`/api/events/${eventId}/coaches`)
    .set("Authorization", `Bearer ${superAdminToken}`)
    .send({ coaches: [{ userId: coachId }] });

  // Create an event group
  const groupRes = await prisma.eventGroup.create({
    data: {
      teamId,
      name: "Public Group",
      description: "Discoverable group",
      color: "#123456",
      createdById: teamAdminId,
      publicBookingSlug: "public-group-slug",
    },
  });
  groupSlugVal = groupRes.publicBookingSlug;

  // Assign event to the group
  await prisma.event.update({
    where: { id: eventId },
    data: { groupId: groupRes.id },
  });
});

afterAll(clearTables);

describe("Public API", () => {
  describe("GET /api/public/teams", () => {
    it("should list active teams without authentication", async () => {
      const res = await request(app).get("/api/public/teams");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.teams).toBeDefined();
      expect(res.body.data.teams.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.teams[0].name).toBe("public team");
    });
  });

  describe("GET /api/public/teams/:teamId/events", () => {
    it("should list active events for a team without authentication", async () => {
      const res = await request(app).get(`/api/public/teams/${teamId}/events`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.events).toBeDefined();
      expect(res.body.data.events.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.events[0].name).toBe("Public Intro");
    });
  });

  describe("slug-based public booking endpoints", () => {
    it("should resolve a team by public slug", async () => {
      const res = await request(app).get(`/api/public/teams/slug/${teamSlug}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.team.publicBookingSlug).toBe(teamSlug);
    });

    it("should list a team's public events by slug", async () => {
      const res = await request(app).get(`/api/public/teams/slug/${teamSlug}/events`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.team.publicBookingSlug).toBe(teamSlug);
      expect(res.body.data.events.some((event: { id: string }) => event.id === eventId)).toBe(true);
    });

    it("should resolve an event by public slug", async () => {
      const res = await request(app).get(`/api/public/events/slug/${eventSlug}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.event.publicBookingSlug).toBe(eventSlug);
      expect(res.body.data.event.teamId).toBe(teamId);
      expect(res.body.data.event).toHaveProperty("showDescription");
    });

    it("should resolve a coach by public slug and list their public events", async () => {
      const coachRes = await request(app).get(`/api/public/coaches/slug/${coachSlug}`);
      const eventsRes = await request(app).get(`/api/public/coaches/slug/${coachSlug}/events`);

      expect(coachRes.status).toBe(200);
      expect(coachRes.body.success).toBe(true);
      expect(coachRes.body.data.coach.publicBookingSlug).toBe(coachSlug);

      expect(eventsRes.status).toBe(200);
      expect(eventsRes.body.success).toBe(true);
      expect(eventsRes.body.data.coach.publicBookingSlug).toBe(coachSlug);
      expect(eventsRes.body.data.events.some((event: { id: string }) => event.id === eventId)).toBe(
        true,
      );
    });

    it("should resolve an event group by public slug", async () => {
      const res = await request(app).get(`/api/public/groups/slug/${groupSlugVal}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.group.publicBookingSlug).toBe(groupSlugVal);
      expect(res.body.data.group.teamId).toBe(teamId);
      expect(res.body.data.group.team).toBeDefined();
    });

    it("should list a group's public events by slug", async () => {
      const res = await request(app).get(`/api/public/groups/slug/${groupSlugVal}/events`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.group.publicBookingSlug).toBe(groupSlugVal);
      expect(res.body.data.events.some((event: { id: string }) => event.id === eventId)).toBe(true);
    });
  });

  describe("GET /api/public/events/:eventId/slots", () => {
    it("should return available slots without authentication", async () => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 7);

      const res = await request(app).get(`/api/public/events/${eventId}/slots`).query({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.slots)).toBe(true);
    });

    it("returns only future predefined slots that satisfy the scheduling rules", async () => {
      const allowedSlot = getNextUtcWeekdayAt(1, 15, 0);
      const blockedByNotice = new Date(Date.now() + 60 * 60 * 1000);

      await request(app)
        .patch(`/api/events/${eventId}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          bookingMode: "FIXED_SLOTS",
          minimumNoticeMinutes: 180,
          maxParticipantCount: 1,
        });

      await request(app)
        .post(`/api/events/${eventId}/schedule-slots`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          startTime: blockedByNotice.toISOString(),
          endTime: new Date(blockedByNotice.getTime() + 30 * 60 * 1000).toISOString(),
        });

      await request(app)
        .post(`/api/events/${eventId}/schedule-slots`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          startTime: allowedSlot.toISOString(),
          endTime: new Date(allowedSlot.getTime() + 30 * 60 * 1000).toISOString(),
        });

      const rangeStart = new Date();
      const rangeEnd = new Date();
      rangeEnd.setDate(rangeStart.getDate() + 10);

      const res = await request(app).get(`/api/public/events/${eventId}/slots`).query({
        startDate: rangeStart.toISOString(),
        endDate: rangeEnd.toISOString(),
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const returnedStartTimes = res.body.data.slots.map(
        (slot: { startTime: string }) => slot.startTime,
      );

      expect(returnedStartTimes).toContain(allowedSlot.toISOString());
      expect(returnedStartTimes).not.toContain(blockedByNotice.toISOString());
    });

    it("should return 400 if dates are missing", async () => {
      const res = await request(app).get(`/api/public/events/${eventId}/slots`);
      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/public/bookings/:id — Authorization header vs query param
  // ─────────────────────────────────────────────────────────────
  describe("GET /api/public/bookings/:id", () => {
    let bookingId: string;
    let rescheduleToken: string;

    beforeAll(async () => {
      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow
      const booking = await prisma.booking.create({
        data: {
          studentName: "Public Token Student",
          studentEmail: "pub-token@example.com",
          teamId,
          eventId,
          coachUserId: coachId,
          startTime,
          endTime: new Date(startTime.getTime() + 1800 * 1000),
          status: "CONFIRMED",
        },
      });
      bookingId = booking.id;
      rescheduleToken = booking.rescheduleToken!;
    });

    it("returns booking when token is sent via Authorization: Bearer header (200)", async () => {
      const res = await request(app)
        .get(`/api/public/bookings/${bookingId}`)
        .set("Authorization", `Bearer ${rescheduleToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.booking.id).toBe(bookingId);
    });

    it("returns booking when token is sent via ?token= query param fallback (200)", async () => {
      const res = await request(app)
        .get(`/api/public/bookings/${bookingId}`)
        .query({ token: rescheduleToken });

      expect(res.status).toBe(200);
      expect(res.body.data.booking.id).toBe(bookingId);
    });

    it("returns 404 for a wrong token regardless of how it is sent", async () => {
      const res = await request(app)
        .get(`/api/public/bookings/${bookingId}`)
        .set("Authorization", "Bearer completely-wrong-token-xyz");

      expect(res.status).toBe(404);
    });
  });

  // GET /api/public/bookings/:id — Defer Coach Reveal masking
  // ─────────────────────────────────────────────────────────────
  describe("GET /api/public/bookings/:id — Defer Coach Reveal masking", () => {
    let deferBookingId: string;
    let deferToken: string;
    let deferSlotId: string;

    beforeAll(async () => {
      const eventTypeRes = await request(app)
        .post("/api/event-types")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          key: "public-defer-offering",
          name: "Public Defer Offering",
          sortOrder: 2,
          isActive: true,
        });
      const deferEventTypeId = eventTypeRes.body.data.id;

      const deferEventRes = await request(app)
        .post(`/api/teams/${teamId}/events`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          name: "Defer Reveal Group Session",
          description: "Group session with deferred coach reveal",
          durationSeconds: 1800,
          locationType: "VIRTUAL",
          locationValue: "https://skills.chegg.com/j/defer-session",
          isActive: true,
          eventTypeId: deferEventTypeId,
          interactionType: "ONE_TO_MANY",
          bookingMode: "FIXED_SLOTS",
          meetingLinkSource: "EVENT_LOCATION",
          deferCoachReveal: true,
          maxParticipantCount: 5,
          fixedLeadCoachId: coachId,
        });
      const deferEventId = deferEventRes.body.data.id;

      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const slot = await prisma.eventScheduleSlot.create({
        data: {
          eventId: deferEventId,
          startTime,
          endTime: new Date(startTime.getTime() + 1800 * 1000),
          assignedCoachId: coachId,
          coachRevealSentAt: null,
        },
      });
      deferSlotId = slot.id;

      // Give the coach a raw personal Zoom link — must never appear in the public payload.
      await prisma.user.update({
        where: { id: coachId },
        data: { zoomIsvLink: "https://zoom.us/isv/dummy/defer-coach-raw-link" },
      });

      const booking = await prisma.booking.create({
        data: {
          studentName: "Defer Reveal Student",
          studentEmail: "defer-reveal@example.com",
          teamId,
          eventId: deferEventId,
          scheduleSlotId: deferSlotId,
          coachUserId: coachId,
          startTime,
          endTime: new Date(startTime.getTime() + 1800 * 1000),
          status: "CONFIRMED",
        },
      });
      deferBookingId = booking.id;
      deferToken = booking.rescheduleToken!;
    });

    it("hides the coach's name/email and the assigned slot coach before reveal has been sent", async () => {
      const res = await request(app)
        .get(`/api/public/bookings/${deferBookingId}`)
        .set("Authorization", `Bearer ${deferToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.booking.coach).toBeNull();
      expect(res.body.data.booking.scheduleSlot?.assignedCoach).toBeNull();
    });

    it("never exposes the coach's raw personal Zoom link, reveal-pending or not", async () => {
      const beforeReveal = await request(app)
        .get(`/api/public/bookings/${deferBookingId}`)
        .set("Authorization", `Bearer ${deferToken}`);
      expect(JSON.stringify(beforeReveal.body)).not.toContain("zoom.us");

      await prisma.eventScheduleSlot.update({
        where: { id: deferSlotId },
        data: { coachRevealSentAt: new Date() },
      });

      const afterReveal = await request(app)
        .get(`/api/public/bookings/${deferBookingId}`)
        .set("Authorization", `Bearer ${deferToken}`);
      expect(JSON.stringify(afterReveal.body)).not.toContain("zoom.us");

      // Reset for any subsequent tests relying on the pre-reveal state.
      await prisma.eventScheduleSlot.update({
        where: { id: deferSlotId },
        data: { coachRevealSentAt: null },
      });
    });

    it("reveals the coach's name once coachRevealSentAt has been set", async () => {
      await prisma.eventScheduleSlot.update({
        where: { id: deferSlotId },
        data: { coachRevealSentAt: new Date() },
      });

      const res = await request(app)
        .get(`/api/public/bookings/${deferBookingId}`)
        .set("Authorization", `Bearer ${deferToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.booking.coach?.firstName).toBe("Public");
      expect(res.body.data.booking.scheduleSlot?.assignedCoach?.firstName).toBe("Public");

      await prisma.eventScheduleSlot.update({
        where: { id: deferSlotId },
        data: { coachRevealSentAt: null },
      });
    });
  });

  describe("GET /api/public/bookings/:bookingId/join", () => {
    const zoomIsvLink = "https://zoom.us/isv/dummy/public-coach-link";

    beforeAll(async () => {
      await prisma.user.update({ where: { id: coachId }, data: { zoomIsvLink } });
    });

    it("redirects to the coach's zoomIsvLink for a booking with its own coachUserId (COACH_AVAILABILITY)", async () => {
      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const booking = await prisma.booking.create({
        data: {
          studentName: "Join Test Student",
          studentEmail: "join-test@example.com",
          teamId,
          eventId,
          coachUserId: coachId,
          startTime,
          endTime: new Date(startTime.getTime() + 1800 * 1000),
          status: "CONFIRMED",
        },
      });

      const res = await request(app)
        .get(`/api/public/bookings/${booking.id}/join`)
        .query({ t: booking.sessionToken });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(zoomIsvLink);
      expect(res.headers["cache-control"]).toBe("no-store");
    });

    // Regression test: FIXED_SLOTS bookings carry the assigned coach on the
    // *slot*, not on the booking itself (booking.coachUserId is null there).
    // The redirect resolver must fall back to the slot's assignedCoach —
    // without it, this always resolved to `no_url` instead of the coach's link.
    it("redirects to the slot's assigned coach's zoomIsvLink when the booking itself has no coachUserId", async () => {
      const slotCoach = await registerUser(superAdminToken, {
        firstName: "Slot",
        lastName: "Coach",
        email: "slot-coach@public.com",
        password: "SlotCoach1234",
        role: "COACH",
      });
      const slotZoomLink = "https://zoom.us/isv/dummy/slot-assigned-coach-link";
      await prisma.user.update({ where: { id: slotCoach.id }, data: { zoomIsvLink: slotZoomLink } });

      const startTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const slot = await prisma.eventScheduleSlot.create({
        data: {
          eventId,
          startTime,
          endTime: new Date(startTime.getTime() + 1800 * 1000),
          assignedCoachId: slotCoach.id,
        },
      });
      const booking = await prisma.booking.create({
        data: {
          studentName: "Slot Join Test Student",
          studentEmail: "slot-join-test@example.com",
          teamId,
          eventId,
          coachUserId: null,
          scheduleSlotId: slot.id,
          startTime,
          endTime: new Date(startTime.getTime() + 1800 * 1000),
          status: "CONFIRMED",
        },
      });

      const res = await request(app)
        .get(`/api/public/bookings/${booking.id}/join`)
        .query({ t: booking.sessionToken });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(slotZoomLink);
    });

    it("redirects to a booking_cancelled status page when the booking is cancelled", async () => {
      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const booking = await prisma.booking.create({
        data: {
          studentName: "Cancelled Join Student",
          studentEmail: "cancelled-join@example.com",
          teamId,
          eventId,
          coachUserId: coachId,
          startTime,
          endTime: new Date(startTime.getTime() + 1800 * 1000),
          status: "CANCELLED",
        },
      });

      const res = await request(app)
        .get(`/api/public/bookings/${booking.id}/join`)
        .query({ t: booking.sessionToken });

      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/\/session\/status\?state=booking_cancelled/);
    });

    it("redirects to a session_ended status page when the session has already ended", async () => {
      const startTime = new Date(Date.now() - 3 * 60 * 60 * 1000);
      const booking = await prisma.booking.create({
        data: {
          studentName: "Ended Join Student",
          studentEmail: "ended-join@example.com",
          teamId,
          eventId,
          coachUserId: coachId,
          startTime,
          endTime: new Date(startTime.getTime() + 1800 * 1000),
          status: "CONFIRMED",
        },
      });

      const res = await request(app)
        .get(`/api/public/bookings/${booking.id}/join`)
        .query({ t: booking.sessionToken });

      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/\/session\/status\?state=session_ended/);
    });

    it("redirects to an invalid status page for a wrong token", async () => {
      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const booking = await prisma.booking.create({
        data: {
          studentName: "Invalid Token Join Student",
          studentEmail: "invalid-token-join@example.com",
          teamId,
          eventId,
          coachUserId: coachId,
          startTime,
          endTime: new Date(startTime.getTime() + 1800 * 1000),
          status: "CONFIRMED",
        },
      });

      const res = await request(app)
        .get(`/api/public/bookings/${booking.id}/join`)
        .query({ t: "completely-wrong-token" });

      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/\/session\/status\?state=invalid/);
    });
  });
});
