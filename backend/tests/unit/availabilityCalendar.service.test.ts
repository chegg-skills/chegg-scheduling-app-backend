import { Prisma, UserRole } from "@prisma/client";
import { createAvailabilityCalendarService } from "../../src/domain/availability/availabilityCalendar.service";
import type { AvailabilityCalendarRepository } from "../../src/domain/availability/availabilityCalendar.repository";
import { ErrorHandler } from "../../src/shared/error/errorhandler";
import type { CallerContext } from "../../src/shared/utils/userUtils";

const admin = { id: "sa-1", role: UserRole.SUPER_ADMIN } as CallerContext;
const teamAdmin = { id: "ta-1", role: UserRole.TEAM_ADMIN } as CallerContext;
const coach = { id: "c-1", role: UserRole.COACH } as CallerContext;

const makeRepo = (
  overrides: Partial<AvailabilityCalendarRepository> = {},
): AvailabilityCalendarRepository => ({
  listWeekly: jest.fn().mockResolvedValue([]),
  findWeekly: jest.fn().mockResolvedValue([]),
  replaceWeekly: jest.fn().mockResolvedValue(undefined),
  listExceptions: jest.fn().mockResolvedValue([]),
  findExceptionsBetween: jest.fn().mockResolvedValue([]),
  createException: jest.fn().mockImplementation(async (data) => ({ id: "x-1", ...data })),
  deleteException: jest.fn().mockResolvedValue({
    id: "x-1",
    date: new Date("2026-06-01T00:00:00.000Z"),
    isUnavailable: true,
    startTime: null,
    endTime: null,
  }),
  listEventCoachWeekly: jest.fn().mockResolvedValue([]),
  replaceEventCoachWeekly: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const make = (repo = makeRepo()) => {
  const deps = {
    queueAvailabilityExceptionNotification: jest.fn().mockResolvedValue(undefined),
    queueAvailabilityExceptionRemovedNotification: jest.fn().mockResolvedValue(undefined),
  };
  return { service: createAvailabilityCalendarService(repo, deps as never), repo, deps };
};

const statusOf = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ErrorHandler);
  return (error as ErrorHandler).statusCode;
};

const slots = [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }];

describe("createAvailabilityCalendarService (fake repository)", () => {
  describe("weekly hours", () => {
    it("lets a user read their own, but not another user's, weekly hours", async () => {
      const { service, repo } = make();
      await service.getWeeklyAvailability("c-1", coach);
      expect(repo.listWeekly).toHaveBeenCalledWith("c-1");
      expect(await statusOf(service.getWeeklyAvailability("someone-else", coach))).toBe(403);
    });

    it("lets admins read anyone's", async () => {
      const { service } = make();
      await expect(service.getWeeklyAvailability("anyone", teamAdmin)).resolves.toEqual([]);
    });

    it("forbids a coach from changing their own recurring hours, even for themselves", async () => {
      const { service, repo } = make();
      expect(await statusOf(service.setWeeklyAvailability("c-1", slots, coach))).toBe(403);
      expect(repo.replaceWeekly).not.toHaveBeenCalled();
    });

    it("validates the slots before writing, then replaces and re-reads", async () => {
      const { service, repo } = make();
      await expect(
        service.setWeeklyAvailability(
          "c-1",
          [{ dayOfWeek: 1, startTime: "17:00", endTime: "09:00" }],
          admin,
        ),
      ).rejects.toThrow();
      expect(repo.replaceWeekly).not.toHaveBeenCalled();

      await service.setWeeklyAvailability("c-1", slots, admin);
      expect(repo.replaceWeekly).toHaveBeenCalledWith("c-1", slots);
      expect(repo.listWeekly).toHaveBeenCalledWith("c-1");
    });
  });

  describe("exceptions", () => {
    it("creates an exception with missing times stored as null, and notifies with the admin flag", async () => {
      const { service, repo, deps } = make();
      await service.addAvailabilityException(
        "c-1",
        { date: "2026-06-01", isUnavailable: true, startTime: null, endTime: undefined },
        teamAdmin,
      );
      expect(repo.createException).toHaveBeenCalledWith({
        userId: "c-1",
        date: new Date("2026-06-01"),
        isUnavailable: true,
        startTime: null,
        endTime: null,
      });
      expect(deps.queueAvailabilityExceptionNotification).toHaveBeenCalledWith({
        userId: "c-1",
        date: "2026-06-01",
        isUnavailable: true,
        startTime: null,
        endTime: undefined,
        callerIsAdmin: true,
      });
    });

    it("marks the notification as not-by-admin when the coach adds their own exception", async () => {
      const { service, deps } = make();
      await service.addAvailabilityException(
        "c-1",
        { date: "2026-06-01", isUnavailable: true },
        coach,
      );
      expect(deps.queueAvailabilityExceptionNotification).toHaveBeenCalledWith(
        expect.objectContaining({ callerIsAdmin: false }),
      );
    });

    it("rejects an invalid date with 400 and writes nothing", async () => {
      const { service, repo } = make();
      expect(
        await statusOf(
          service.addAvailabilityException(
            "c-1",
            { date: "not-a-date", isUnavailable: true },
            admin,
          ),
        ),
      ).toBe(400);
      expect(repo.createException).not.toHaveBeenCalled();
    });

    it("forbids managing another user's exceptions", async () => {
      const { service } = make();
      expect(await statusOf(service.getAvailabilityExceptions("someone-else", coach))).toBe(403);
    });

    it("removes an exception and notifies with what was deleted", async () => {
      const { service, repo, deps } = make();
      await service.removeAvailabilityException("c-1", "x-1", admin);
      expect(repo.deleteException).toHaveBeenCalledWith("x-1", "c-1");
      expect(deps.queueAvailabilityExceptionRemovedNotification).toHaveBeenCalledWith({
        userId: "c-1",
        date: new Date("2026-06-01T00:00:00.000Z"),
        isUnavailable: true,
        startTime: null,
        endTime: null,
        callerIsAdmin: true,
      });
    });

    it("maps a missing exception (P2025) to 404 without notifying, and rethrows anything else", async () => {
      const missing = new Prisma.PrismaClientKnownRequestError("nf", {
        code: "P2025",
        clientVersion: "t",
      });
      const a = make(makeRepo({ deleteException: jest.fn().mockRejectedValue(missing) }));
      expect(await statusOf(a.service.removeAvailabilityException("c-1", "x", admin))).toBe(404);
      expect(a.deps.queueAvailabilityExceptionRemovedNotification).not.toHaveBeenCalled();

      const boom = new Error("db down");
      const b = make(makeRepo({ deleteException: jest.fn().mockRejectedValue(boom) }));
      await expect(b.service.removeAvailabilityException("c-1", "x", admin)).rejects.toBe(boom);
    });
  });

  describe("event-specific coach hours", () => {
    it("reads the override ordered, via the repository", async () => {
      const { service, repo } = make();
      await service.getEventCoachWeeklyAvailability("e-1", "c-1");
      expect(repo.listEventCoachWeekly).toHaveBeenCalledWith("e-1", "c-1");
    });

    it("only admins may set it; a coach (even for themselves) gets 403", async () => {
      const { service, repo } = make();
      expect(
        await statusOf(service.setEventCoachWeeklyAvailability("e-1", "c-1", slots, coach)),
      ).toBe(403);
      expect(repo.replaceEventCoachWeekly).not.toHaveBeenCalled();
      await service.setEventCoachWeeklyAvailability("e-1", "c-1", slots, teamAdmin);
      expect(repo.replaceEventCoachWeekly).toHaveBeenCalledWith("e-1", "c-1", slots);
      expect(repo.listEventCoachWeekly).toHaveBeenCalledWith("e-1", "c-1");
    });

    it("validates before writing", async () => {
      const { service, repo } = make();
      await expect(
        service.setEventCoachWeeklyAvailability(
          "e-1",
          "c-1",
          [{ dayOfWeek: 1, startTime: "17:00", endTime: "09:00" }],
          admin,
        ),
      ).rejects.toThrow();
      expect(repo.replaceEventCoachWeekly).not.toHaveBeenCalled();
    });
  });

  describe("getEffectiveAvailabilityData", () => {
    it("checks access, then reads weekly hours and exceptions for the range together", async () => {
      const { service, repo } = make();
      const from = new Date("2026-06-01");
      const to = new Date("2026-06-30");
      const result = await service.getEffectiveAvailabilityData("c-1", from, to, coach);
      expect(repo.findWeekly).toHaveBeenCalledWith("c-1");
      expect(repo.findExceptionsBetween).toHaveBeenCalledWith("c-1", from, to);
      expect(result).toEqual({ weekly: [], exceptions: [] });
      expect(await statusOf(service.getEffectiveAvailabilityData("other", from, to, coach))).toBe(
        403,
      );
    });
  });
});
