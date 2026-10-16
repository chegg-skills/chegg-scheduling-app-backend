import { MeetingLinkSource } from "@prisma/client";
import { createPublicService } from "../../src/domain/public/public.service";
import type { PublicRepository } from "../../src/domain/public/public.repository";
import { ErrorHandler } from "../../src/shared/error/errorhandler";

const makeRepo = (overrides: Partial<PublicRepository> = {}): PublicRepository => ({
  listActiveTeams: jest.fn().mockResolvedValue([]),
  findActiveTeamBySlug: jest.fn().mockResolvedValue(null),
  listActiveTeamEvents: jest.fn().mockResolvedValue([]),
  findEventBySlug: jest.fn().mockResolvedValue(null),
  findCoachBySlug: jest.fn().mockResolvedValue(null),
  listActiveCoachEvents: jest.fn().mockResolvedValue([]),
  findGroupBySlug: jest.fn().mockResolvedValue(null),
  listActiveGroupEvents: jest.fn().mockResolvedValue([]),
  findDirectoryBySlug: jest.fn().mockResolvedValue(null),
  listActiveEventsForPairs: jest.fn().mockResolvedValue([]),
  findBookingForJoin: jest.fn().mockResolvedValue(null),
  findBookingByRescheduleToken: jest.fn().mockResolvedValue(null),
  ...overrides,
});

const makeService = (repo: PublicRepository, defaultQuestions: string[] = ["Default?"]) => {
  const getDefaultQuestionTexts = jest.fn().mockResolvedValue(defaultQuestions);
  return {
    service: createPublicService(repo, { getDefaultQuestionTexts }),
    getDefaultQuestionTexts,
  };
};

const statusOf = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ErrorHandler);
  return (error as ErrorHandler).statusCode;
};

const HOUR = 60 * 60 * 1000;

describe("createPublicService (fake repository)", () => {
  describe("slug handling", () => {
    it("trims slugs before querying and rejects blank ones", async () => {
      const repo = makeRepo({
        findActiveTeamBySlug: jest.fn().mockResolvedValue({ id: "t-1", name: "T" }),
      });
      const { service } = makeService(repo);
      await service.getTeamBySlug("  my-team ");
      expect(repo.findActiveTeamBySlug).toHaveBeenCalledWith("my-team");
      await expect(service.getTeamBySlug("   ")).rejects.toThrow("Slug is required");
    });

    it("404s for an unknown team", async () => {
      expect(await statusOf(makeService(makeRepo()).service.getTeamBySlug("x"))).toBe(404);
    });

    it("lists a team's events together with the team", async () => {
      const team = { id: "t-1", name: "T" };
      const events = [{ id: "e-1" }];
      const repo = makeRepo({
        findActiveTeamBySlug: jest.fn().mockResolvedValue(team),
        listActiveTeamEvents: jest.fn().mockResolvedValue(events),
      });
      const result = await makeService(repo).service.listTeamEventsBySlug("t");
      expect(result).toEqual({ team, events });
      expect(repo.listActiveTeamEvents).toHaveBeenCalledWith("t-1");
    });
  });

  describe("getEventBySlug", () => {
    const event = (overrides: Record<string, unknown> = {}) =>
      ({
        id: "e-1",
        isActive: true,
        team: { isActive: true },
        useDefaultQuestions: false,
        customQuestions: ["Q1"],
        ...overrides,
      }) as never;

    it("404s for an unknown link, and 400s (not 404) for an inactive event or team", async () => {
      expect(await statusOf(makeService(makeRepo()).service.getEventBySlug("x"))).toBe(404);

      for (const inactive of [{ isActive: false }, { team: { isActive: false } }]) {
        const repo = makeRepo({ findEventBySlug: jest.fn().mockResolvedValue(event(inactive)) });
        expect(await statusOf(makeService(repo).service.getEventBySlug("x"))).toBe(400);
      }
    });

    it("hides the internal isActive flag and returns the custom questions", async () => {
      const repo = makeRepo({ findEventBySlug: jest.fn().mockResolvedValue(event()) });
      const { service, getDefaultQuestionTexts } = makeService(repo);
      const result = await service.getEventBySlug("x");
      expect(result).not.toHaveProperty("isActive");
      expect(result.effectiveBookingQuestions).toEqual(["Q1"]);
      expect(getDefaultQuestionTexts).not.toHaveBeenCalled();
    });

    it("uses the team default questions when the event opts in", async () => {
      const repo = makeRepo({
        findEventBySlug: jest
          .fn()
          .mockResolvedValue(event({ useDefaultQuestions: true, customQuestions: ["ignored"] })),
      });
      const { service, getDefaultQuestionTexts } = makeService(repo, ["Default A", "Default B"]);
      const result = await service.getEventBySlug("x");
      expect(result.effectiveBookingQuestions).toEqual(["Default A", "Default B"]);
      expect(getDefaultQuestionTexts).toHaveBeenCalledTimes(1);
    });
  });

  describe("coaches", () => {
    const coach = (overrides: Record<string, unknown> = {}) =>
      ({ id: "c-1", firstName: "Ada", role: "COACH", isActive: true, ...overrides }) as never;

    it("404s for unknown, inactive, or non-coach users alike", async () => {
      for (const found of [null, coach({ isActive: false }), coach({ role: "TEAM_ADMIN" })]) {
        const repo = makeRepo({ findCoachBySlug: jest.fn().mockResolvedValue(found) });
        expect(await statusOf(makeService(repo).service.getCoachBySlug("c"))).toBe(404);
      }
    });

    it("strips role and isActive from the public coach", async () => {
      const repo = makeRepo({ findCoachBySlug: jest.fn().mockResolvedValue(coach()) });
      const result = await makeService(repo).service.getCoachBySlug("c");
      expect(result).toEqual({ id: "c-1", firstName: "Ada" });
    });

    it("lists the events for the resolved coach id", async () => {
      const repo = makeRepo({ findCoachBySlug: jest.fn().mockResolvedValue(coach()) });
      await makeService(repo).service.listCoachEventsBySlug("c");
      expect(repo.listActiveCoachEvents).toHaveBeenCalledWith("c-1");
    });
  });

  describe("groups", () => {
    it("404s for an unknown group, and returns the group's team alongside its events", async () => {
      expect(await statusOf(makeService(makeRepo()).service.getGroupBySlug("g"))).toBe(404);

      const group = { id: "g-1", team: { id: "t-1" } };
      const repo = makeRepo({ findGroupBySlug: jest.fn().mockResolvedValue(group) });
      const result = await makeService(repo).service.listGroupEventsBySlug("g");
      expect(result).toMatchObject({ group, team: group.team, events: [] });
      expect(repo.listActiveGroupEvents).toHaveBeenCalledWith("g-1");
    });
  });

  describe("getPublicBookingDirectory", () => {
    const directory = {
      id: "d-1",
      slug: "dir",
      name: "Dir",
      description: null,
      isActive: true,
      sections: [
        {
          eventTypeId: "et-1",
          eventType: { id: "et-1", isActive: true },
          teams: [
            { teamId: "t-1", team: { id: "t-1", isActive: true } },
            { teamId: "t-2", team: { id: "t-2", isActive: false } },
          ],
        },
        {
          eventTypeId: "et-2",
          eventType: { id: "et-2", isActive: false },
          teams: [{ teamId: "t-1", team: { id: "t-1", isActive: true } }],
        },
      ],
    };

    it("404s for an unknown or inactive directory", async () => {
      for (const found of [null, { ...directory, isActive: false }]) {
        const repo = makeRepo({ findDirectoryBySlug: jest.fn().mockResolvedValue(found) });
        expect(await statusOf(makeService(repo).service.getPublicBookingDirectory("d"))).toBe(404);
      }
    });

    it("loads events only for active (team, event type) pairs and groups them per section", async () => {
      const repo = makeRepo({
        findDirectoryBySlug: jest.fn().mockResolvedValue(directory),
        listActiveEventsForPairs: jest.fn().mockResolvedValue([
          { id: "e-1", teamId: "t-1", eventTypeId: "et-1", name: "A" },
          { id: "e-2", teamId: "t-1", eventTypeId: "et-1", name: "B" },
        ]),
      });
      const result = await makeService(repo).service.getPublicBookingDirectory("dir");

      expect(repo.listActiveEventsForPairs).toHaveBeenCalledWith([
        { teamId: "t-1", eventTypeId: "et-1" },
      ]);
      expect(result.sections).toHaveLength(1); // the inactive event type is dropped
      expect(result.sections[0].teams).toHaveLength(1); // the inactive team is dropped
      expect(result.sections[0].teams[0].events.map((e: { id: string }) => e.id)).toEqual([
        "e-1",
        "e-2",
      ]);
      // eventTypeId is an internal grouping key and is not leaked onto events
      expect(result.sections[0].teams[0].events[0]).not.toHaveProperty("eventTypeId");
    });

    it("skips the events query entirely when there is nothing active", async () => {
      const repo = makeRepo({
        findDirectoryBySlug: jest.fn().mockResolvedValue({ ...directory, sections: [] }),
      });
      await makeService(repo).service.getPublicBookingDirectory("dir");
      expect(repo.listActiveEventsForPairs).not.toHaveBeenCalled();
    });
  });

  describe("resolveBookingJoinRedirect", () => {
    const booking = (overrides: Record<string, unknown> = {}) => ({
      status: "CONFIRMED",
      endTime: new Date(Date.now() + HOUR),
      coach: { zoomIsvLink: "https://zoom.us/coach" },
      scheduleSlot: null,
      event: {
        meetingLinkSource: MeetingLinkSource.COACH_PERSONAL_LINK,
        locationValue: "https://loc.example/room",
      },
      ...overrides,
    });
    const resolve = (b: unknown) =>
      makeService(
        makeRepo({ findBookingForJoin: jest.fn().mockResolvedValue(b) }),
      ).service.resolveBookingJoinRedirect("b-1", "tok");

    it("passes the id and token to the lookup", async () => {
      const repo = makeRepo();
      await makeService(repo).service.resolveBookingJoinRedirect("b-1", "tok");
      expect(repo.findBookingForJoin).toHaveBeenCalledWith("b-1", "tok");
    });

    it.each([
      ["no match for the id+token", null, "invalid"],
      ["a cancelled booking", booking({ status: "CANCELLED" }), "booking_cancelled"],
      ["a cancelled slot", booking({ scheduleSlot: { isCancelled: true } }), "slot_cancelled"],
      ["an ended session", booking({ endTime: new Date(Date.now() - HOUR) }), "session_ended"],
      [
        "no usable link",
        booking({
          coach: null,
          event: { meetingLinkSource: MeetingLinkSource.COACH_PERSONAL_LINK, locationValue: null },
        }),
        "no_url",
      ],
    ])("returns a %s status", async (_label, b, state) => {
      expect(await resolve(b)).toEqual({ type: "status", state });
    });

    it("redirects to the coach's link, or the event location when the event prefers it", async () => {
      expect(await resolve(booking())).toEqual({ type: "redirect", url: "https://zoom.us/coach" });
      expect(
        await resolve(
          booking({
            event: {
              meetingLinkSource: MeetingLinkSource.EVENT_LOCATION,
              locationValue: "https://loc.example/room",
            },
          }),
        ),
      ).toEqual({ type: "redirect", url: "https://loc.example/room" });
    });

    it("prefers the slot's own join URL, and the slot's assigned coach over the booking's coach", async () => {
      expect(
        await resolve(
          booking({
            scheduleSlot: { isCancelled: false, sessionJoinUrl: "https://slot.example/join" },
          }),
        ),
      ).toEqual({ type: "redirect", url: "https://slot.example/join" });

      expect(
        await resolve(
          booking({
            scheduleSlot: {
              isCancelled: false,
              sessionJoinUrl: null,
              assignedCoach: { zoomIsvLink: "https://zoom.us/slot-coach" },
            },
          }),
        ),
      ).toEqual({ type: "redirect", url: "https://zoom.us/slot-coach" });
    });

    it("refuses to redirect to anything but https", async () => {
      expect(
        await resolve(
          booking({
            coach: { zoomIsvLink: "http://insecure.example/room" },
            event: {
              meetingLinkSource: MeetingLinkSource.COACH_PERSONAL_LINK,
              locationValue: null,
            },
          }),
        ),
      ).toEqual({ type: "status", state: "no_url" });
      expect(
        await resolve(
          booking({
            coach: { zoomIsvLink: "not a url" },
            event: {
              meetingLinkSource: MeetingLinkSource.COACH_PERSONAL_LINK,
              locationValue: null,
            },
          }),
        ),
      ).toEqual({ type: "status", state: "no_url" });
    });
  });

  describe("getPublicBooking", () => {
    const stored = (overrides: Record<string, unknown> = {}) =>
      ({
        id: "b-1",
        status: "CONFIRMED",
        startTime: new Date(Date.now() + HOUR),
        event: { durationSeconds: 1800, deferCoachReveal: false },
        coach: { id: "c-1", zoomIsvLink: "https://zoom.us/secret" },
        scheduleSlot: {
          coachRevealSentAt: null,
          assignedCoach: { id: "c-2", zoomIsvLink: "https://zoom.us/secret2" },
        },
        ...overrides,
      }) as never;
    const get = (b: unknown, mode?: string) =>
      makeService(
        makeRepo({ findBookingByRescheduleToken: jest.fn().mockResolvedValue(b) }),
      ).service.getPublicBooking("b-1", "tok", mode);

    it("404s for a wrong token", async () => {
      expect(await statusOf(get(null))).toBe(404);
    });

    it("applies the cancel rules in cancel mode and the reschedule rules otherwise", async () => {
      // A booking whose session has already started cannot be cancelled, but can still be rescheduled.
      const started = stored({ startTime: new Date(Date.now() - 10 * 60 * 1000) });
      expect(await statusOf(get(started, "cancel"))).toBe(403);
      await expect(get(started)).resolves.toBeDefined();
    });

    it("never exposes a personal Zoom link once the coach is revealed", async () => {
      const result = (await get(stored())) as {
        coach: { zoomIsvLink: string | null };
        scheduleSlot: { assignedCoach: { zoomIsvLink: string | null } };
      };
      expect(result.coach.zoomIsvLink).toBeNull();
      expect(result.scheduleSlot.assignedCoach.zoomIsvLink).toBeNull();
    });

    it("hides the coach entirely while a deferred reveal is still pending", async () => {
      const pending = stored({ event: { durationSeconds: 1800, deferCoachReveal: true } });
      const result = (await get(pending)) as {
        coach: unknown;
        scheduleSlot: { assignedCoach: unknown };
      };
      expect(result.coach).toBeNull();
      expect(result.scheduleSlot.assignedCoach).toBeNull();
    });

    it("treats a deferred reveal as complete once the reveal has been sent", async () => {
      const revealed = stored({
        event: { durationSeconds: 1800, deferCoachReveal: true },
        scheduleSlot: {
          coachRevealSentAt: new Date(),
          assignedCoach: { id: "c-2", zoomIsvLink: "https://zoom.us/x" },
        },
      });
      const result = (await get(revealed)) as { coach: { id: string; zoomIsvLink: string | null } };
      expect(result.coach.id).toBe("c-1"); // coach stays visible
      expect(result.coach.zoomIsvLink).toBeNull(); // but the raw link never does
    });
  });
});
