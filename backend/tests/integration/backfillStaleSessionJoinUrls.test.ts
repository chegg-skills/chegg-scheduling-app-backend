import { prisma } from "../../src/shared/db/prisma";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";
import { run } from "../../src/scripts/ops/backfill-stale-session-join-urls";

describe("backfill-stale-session-join-urls", () => {
  let teamId: string;
  let eventId: string;
  let coachOneId: string;
  let coachTwoId: string;

  beforeAll(async () => {
    await clearTables();

    const superAdmin = await bootstrapAdmin("super@backfill-stale.com", "Admin1234");
    const teamAdmin = await registerUser(superAdmin.token, {
      firstName: "Team",
      lastName: "Admin",
      email: "teamadmin@backfill-stale.com",
      password: "TeamAdmin1234",
      role: "TEAM_ADMIN",
    });
    const coachOne = await registerUser(superAdmin.token, {
      firstName: "Coach",
      lastName: "One",
      email: "coach1@backfill-stale.com",
      password: "Coach1234",
      role: "COACH",
    });
    const coachTwo = await registerUser(superAdmin.token, {
      firstName: "Coach",
      lastName: "Two",
      email: "coach2@backfill-stale.com",
      password: "Coach1234",
      role: "COACH",
    });
    coachOneId = coachOne.id;
    coachTwoId = coachTwo.id;

    await prisma.user.update({
      where: { id: coachOneId },
      data: { zoomIsvLink: "https://zoom.us/isv/dummy/coach-one-room" },
    });
    await prisma.user.update({
      where: { id: coachTwoId },
      data: { zoomIsvLink: "https://zoom.us/isv/dummy/coach-two-room" },
    });

    const team = await prisma.team.create({
      data: {
        name: "Backfill Stale Team",
        createdById: superAdmin.id,
        teamLeadId: teamAdmin.id,
        publicBookingSlug: "backfill-stale-team",
      },
    });
    teamId = team.id;

    const offering = await prisma.eventType.create({
      data: {
        key: "backfill_stale_offering",
        name: "Backfill Stale Offering",
        createdById: superAdmin.id,
        updatedById: superAdmin.id,
      },
    });

    const event = await prisma.event.create({
      data: {
        name: "Backfill Stale Event",
        teamId,
        eventTypeId: offering.id,
        interactionType: "ONE_TO_MANY",
        assignmentStrategy: "DIRECT",
        bookingMode: "FIXED_SLOTS",
        durationSeconds: 1800,
        locationType: "VIRTUAL",
        locationValue: "https://meet.example.com",
        meetingLinkSource: "COACH_ISV",
        deferCoachReveal: true,
        fixedLeadCoachId: coachOneId,
        createdById: superAdmin.id,
        updatedById: superAdmin.id,
        publicBookingSlug: "backfill-stale-event",
      },
    });
    eventId = event.id;
  });

  afterAll(clearTables);

  it("clears sessionJoinUrl only for slots whose stored value no longer matches the current coach", async () => {
    const staleSlot = await prisma.eventScheduleSlot.create({
      data: {
        eventId,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
        assignedCoachId: coachTwoId,
        coachRevealSentAt: new Date(),
        // Frozen at reveal time when coachOne was assigned — now stale since
        // assignedCoachId has since moved to coachTwo without going through
        // updateEventScheduleSlot (simulating pre-fix corrupted data).
        sessionJoinUrl: "https://zoom.us/isv/dummy/coach-one-room",
      },
    });

    const currentSlot = await prisma.eventScheduleSlot.create({
      data: {
        eventId,
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 49 * 60 * 60 * 1000),
        assignedCoachId: coachOneId,
        coachRevealSentAt: new Date(),
        // Matches what coachOne's current zoomIsvLink would resolve to — not stale.
        sessionJoinUrl: "https://zoom.us/isv/dummy/coach-one-room",
      },
    });

    const notRevealedSlot = await prisma.eventScheduleSlot.create({
      data: {
        eventId,
        startTime: new Date(Date.now() + 72 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 73 * 60 * 60 * 1000),
        assignedCoachId: coachOneId,
        coachRevealSentAt: null,
        sessionJoinUrl: null,
      },
    });

    await run(true);

    const staleAfter = await prisma.eventScheduleSlot.findUnique({ where: { id: staleSlot.id } });
    const currentAfter = await prisma.eventScheduleSlot.findUnique({ where: { id: currentSlot.id } });
    const notRevealedAfter = await prisma.eventScheduleSlot.findUnique({ where: { id: notRevealedSlot.id } });

    expect(staleAfter?.sessionJoinUrl).toBeNull();
    expect(currentAfter?.sessionJoinUrl).toBe("https://zoom.us/isv/dummy/coach-one-room");
    expect(notRevealedAfter?.sessionJoinUrl).toBeNull();
  });

  it("dry run (apply=false) does not modify any data", async () => {
    const slot = await prisma.eventScheduleSlot.create({
      data: {
        eventId,
        startTime: new Date(Date.now() + 96 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 97 * 60 * 60 * 1000),
        assignedCoachId: coachTwoId,
        coachRevealSentAt: new Date(),
        sessionJoinUrl: "https://zoom.us/isv/dummy/coach-one-room",
      },
    });

    await run(false);

    const after = await prisma.eventScheduleSlot.findUnique({ where: { id: slot.id } });
    expect(after?.sessionJoinUrl).toBe("https://zoom.us/isv/dummy/coach-one-room");
  });
});
