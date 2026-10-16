import { UserRole } from "@prisma/client";
import { createTrackerService } from "../../src/domain/tracker/tracker.service";
import type {
  TrackerRepository,
  TrackerSlotRow,
} from "../../src/domain/tracker/tracker.repository";
import { ErrorHandler } from "../../src/shared/error/errorhandler";
import type { CallerContext } from "../../src/shared/utils/userUtils";

const superAdmin = { id: "sa-1", role: UserRole.SUPER_ADMIN } as CallerContext;
const teamAdmin = { id: "ta-1", role: UserRole.TEAM_ADMIN } as CallerContext;
const coach = { id: "c-1", role: UserRole.COACH } as CallerContext;

const makeRepo = (overrides: Partial<TrackerRepository> = {}): TrackerRepository => ({
  findSlots: jest.fn().mockResolvedValue([]),
  findSlotIdsByRecurrenceGroups: jest.fn().mockResolvedValue([]),
  findSlotStartTimes: jest.fn().mockResolvedValue([]),
  findTeams: jest.fn().mockResolvedValue([]),
  findEvents: jest.fn().mockResolvedValue([]),
  ...overrides,
});

const HOUR = 60 * 60 * 1000;

const makeSlot = (overrides: Record<string, unknown> = {}): TrackerSlotRow =>
  ({
    id: "slot-1",
    startTime: new Date(Date.now() + HOUR),
    endTime: new Date(Date.now() + 2 * HOUR),
    capacity: null,
    event: {
      id: "e-1",
      name: "Workshop",
      maxParticipantCount: 10,
      teamId: "t-1",
      team: { id: "t-1", name: "Team" },
      eventType: null,
    },
    assignedCoach: null,
    recurrenceGroup: null,
    sessionLog: null,
    _count: { bookings: 0 },
    ...overrides,
  }) as unknown as TrackerSlotRow;

const rejects403 = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ErrorHandler);
  expect((error as ErrorHandler).statusCode).toBe(403);
};

describe("createTrackerService (fake repository)", () => {
  it("denies coaches on every endpoint without querying", async () => {
    const repo = makeRepo();
    const service = createTrackerService(repo);

    await rejects403(service.getTrackerSlots(coach, {}));
    await rejects403(
      service.getSessionDates(coach, { startDate: "2026-01-01", endDate: "2026-01-31" }),
    );
    await rejects403(service.getTrackerFilters(coach));
    expect(repo.findSlots).not.toHaveBeenCalled();
    expect(repo.findSlotStartTimes).not.toHaveBeenCalled();
    expect(repo.findTeams).not.toHaveBeenCalled();
  });

  it("scopes a TEAM_ADMIN to the teams they lead, but not a SUPER_ADMIN", async () => {
    const repo = makeRepo();
    const service = createTrackerService(repo);

    await service.getTrackerSlots(teamAdmin, {});
    await service.getTrackerSlots(superAdmin, {});

    const [adminWhere, superWhere] = (repo.findSlots as jest.Mock).mock.calls.map((c) => c[0]);
    expect(adminWhere.event.team).toEqual({ deletedAt: null, teamLeadId: "ta-1" });
    expect(superWhere.event.team).toEqual({ deletedAt: null });
  });

  it("scopes filter lists the same way", async () => {
    const repo = makeRepo();
    await createTrackerService(repo).getTrackerFilters(teamAdmin);
    expect(repo.findTeams).toHaveBeenCalledWith({ teamLeadId: "ta-1", deletedAt: null });
  });

  describe("slot status", () => {
    const statusFor = async (slot: TrackerSlotRow) => {
      const repo = makeRepo({ findSlots: jest.fn().mockResolvedValue([slot]) });
      const [result] = await createTrackerService(repo).getTrackerSlots(superAdmin, {});
      return result;
    };

    it("is OPEN with seats remaining", async () => {
      const result = await statusFor(makeSlot({ _count: { bookings: 3 } }));
      expect(result).toMatchObject({ status: "OPEN", capacity: 10, remainingSeats: 7 });
    });

    it("is FULL once bookings reach capacity (slot capacity overrides the event's)", async () => {
      const result = await statusFor(makeSlot({ capacity: 2, _count: { bookings: 2 } }));
      expect(result).toMatchObject({ status: "FULL", remainingSeats: 0 });
    });

    it("is CLOSED once the slot has ended", async () => {
      const result = await statusFor(
        makeSlot({
          startTime: new Date(Date.now() - 3 * HOUR),
          endTime: new Date(Date.now() - 2 * HOUR),
        }),
      );
      expect(result.status).toBe("CLOSED");
    });

    it("counts only attended sessions in a logged slot", async () => {
      const result = await statusFor(
        makeSlot({
          sessionLog: {
            id: "l-1",
            summary: "s",
            coachNotes: null,
            attendance: [{ attended: true }, { attended: false }, { attended: true }],
          },
        }),
      );
      expect(result).toMatchObject({ isLogged: true, attendedCount: 2, summary: "s" });
    });
  });

  it("numbers sessions within a recurrence series", async () => {
    const group = { id: "g-1", frequency: "WEEKLY" };
    const repo = makeRepo({
      findSlots: jest.fn().mockResolvedValue([makeSlot({ id: "b", recurrenceGroup: group })]),
      findSlotIdsByRecurrenceGroups: jest.fn().mockResolvedValue([
        { id: "a", recurrenceGroupId: "g-1" },
        { id: "b", recurrenceGroupId: "g-1" },
        { id: "c", recurrenceGroupId: "g-1" },
      ]),
    });
    const [result] = await createTrackerService(repo).getTrackerSlots(superAdmin, {});
    expect(result).toMatchObject({
      seriesFrequency: "WEEKLY",
      seriesSessionNumber: 2,
      seriesTotalCount: 3,
    });
  });

  it("skips the series lookup when no slot belongs to a recurrence group", async () => {
    const repo = makeRepo({ findSlots: jest.fn().mockResolvedValue([makeSlot()]) });
    await createTrackerService(repo).getTrackerSlots(superAdmin, {});
    expect(repo.findSlotIdsByRecurrenceGroups).not.toHaveBeenCalled();
  });

  it("de-duplicates session dates", async () => {
    const repo = makeRepo({
      findSlotStartTimes: jest
        .fn()
        .mockResolvedValue([
          { startTime: new Date(2026, 5, 1, 9) },
          { startTime: new Date(2026, 5, 1, 15) },
          { startTime: new Date(2026, 5, 2, 9) },
        ]),
    });
    const result = await createTrackerService(repo).getSessionDates(superAdmin, {
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
    expect(result.dates).toEqual(["2026-06-01", "2026-06-02"]);
  });
});
