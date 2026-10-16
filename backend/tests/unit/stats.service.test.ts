import { BookingStatus, UserRole } from "@prisma/client";
import { createStatsService } from "../../src/domain/stats/stats.service";
import type { StatsRepository } from "../../src/domain/stats/stats.repository";
import { ErrorHandler } from "../../src/shared/error/errorhandler";
import type { CallerContext } from "../../src/shared/utils/userUtils";

const superAdmin = { id: "sa-1", role: UserRole.SUPER_ADMIN } as CallerContext;
const teamAdmin = { id: "ta-1", role: UserRole.TEAM_ADMIN } as CallerContext;
const coach = { id: "c-1", role: UserRole.COACH } as CallerContext;

const makeRepo = (overrides: Partial<StatsRepository> = {}): StatsRepository => ({
  countBookings: jest.fn().mockResolvedValue(0),
  groupBookingsBySlot: jest.fn().mockResolvedValue([]),
  topCoachGroup: jest.fn().mockResolvedValue([]),
  topTeamGroup: jest.fn().mockResolvedValue([]),
  groupBookingsByTeamAndStatus: jest.fn().mockResolvedValue([]),
  findBookingStartsWithStatus: jest.fn().mockResolvedValue([]),
  findBookingStarts: jest.fn().mockResolvedValue([]),
  findUserById: jest.fn().mockResolvedValue(null),
  findTeamById: jest.fn().mockResolvedValue(null),
  findTeamNames: jest.fn().mockResolvedValue([]),
  findDistinctEventTeamIds: jest.fn().mockResolvedValue([]),
  countUsers: jest.fn().mockResolvedValue(0),
  countInvites: jest.fn().mockResolvedValue(0),
  countTeams: jest.fn().mockResolvedValue(0),
  countTeamMembers: jest.fn().mockResolvedValue(0),
  countEvents: jest.fn().mockResolvedValue(0),
  countEventTypes: jest.fn().mockResolvedValue(0),
  ...overrides,
});

const isForbidden = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ErrorHandler);
  expect((error as ErrorHandler).statusCode).toBe(403);
};

describe("createStatsService (fake repository)", () => {
  describe("admin-only endpoints", () => {
    it("deny coaches without querying", async () => {
      const repo = makeRepo();
      const service = createStatsService(repo);

      await isForbidden(service.getUserStats(coach));
      await isForbidden(service.getTeamStats(coach));
      await isForbidden(service.getEventStats(coach));
      await isForbidden(service.getEventTypeStats(coach));
      await isForbidden(service.getInteractionTypeStats(coach));
      await isForbidden(service.getTeamPerformance(coach));

      expect(repo.countUsers).not.toHaveBeenCalled();
      expect(repo.countTeams).not.toHaveBeenCalled();
      expect(repo.countEvents).not.toHaveBeenCalled();
      expect(repo.countEventTypes).not.toHaveBeenCalled();
      expect(repo.findTeamNames).not.toHaveBeenCalled();
    });
  });

  describe("getBookingStats", () => {
    it("scopes a COACH to their own bookings; admins see everything", async () => {
      const coachRepo = makeRepo();
      await createStatsService(coachRepo).getBookingStats(coach, "all");
      const adminRepo = makeRepo();
      await createStatsService(adminRepo).getBookingStats(teamAdmin, "all");

      for (const [where] of (coachRepo.countBookings as jest.Mock).mock.calls) {
        expect(where).toMatchObject({ coachUserId: "c-1" });
      }
      for (const [where] of (adminRepo.countBookings as jest.Mock).mock.calls) {
        expect(where).not.toHaveProperty("coachUserId");
      }
    });

    it("counts a slot with many students as one session (slot dedup)", async () => {
      const repo = makeRepo({
        countBookings: jest.fn().mockResolvedValue(10),
        // 2 distinct slots, however many bookings each has.
        groupBookingsBySlot: jest
          .fn()
          .mockResolvedValue([{ scheduleSlotId: "s1" }, { scheduleSlotId: "s2" }]),
      });
      const { metrics } = await createStatsService(repo).getBookingStats(superAdmin, "all");
      // Every count mock returns 10, so "individual" bookings are 10: 2 slot sessions + 10.
      expect(metrics.sessionsConducted).toBe(12);
      expect(metrics.upcomingBookings).toBe(12);
      expect(metrics.totalBookings).toBe(10);
    });

    it("skips the top coach/team lookups when there are no bookings", async () => {
      const repo = makeRepo({ countBookings: jest.fn().mockResolvedValue(0) });
      await createStatsService(repo).getBookingStats(superAdmin, "all");
      expect(repo.topCoachGroup).not.toHaveBeenCalled();
      expect(repo.topTeamGroup).not.toHaveBeenCalled();
    });

    it("never looks up a top team for a COACH", async () => {
      const repo = makeRepo({
        countBookings: jest.fn().mockResolvedValue(3),
        topCoachGroup: jest.fn().mockResolvedValue([{ coachUserId: "c-1", _count: { _all: 3 } }]),
        findUserById: jest.fn().mockResolvedValue({ id: "c-1", firstName: "Ada", lastName: "L" }),
      });
      const result = (await createStatsService(repo).getBookingStats(coach, "all")).metrics;
      expect(repo.topTeamGroup).not.toHaveBeenCalled();
      expect(result.mostBookedCoach).toEqual({ id: "c-1", name: "Ada L", count: 3 });
      expect(result.mostBookedTeam).toBeUndefined();
    });

    it("omits the top coach when the user row no longer exists", async () => {
      const repo = makeRepo({
        countBookings: jest.fn().mockResolvedValue(3),
        topCoachGroup: jest.fn().mockResolvedValue([{ coachUserId: "gone", _count: { _all: 3 } }]),
      });
      const result = (await createStatsService(repo).getBookingStats(superAdmin, "all")).metrics;
      expect(result.mostBookedCoach).toBeUndefined();
    });
  });

  describe("getEventStats", () => {
    it("scopes every count to the requested team", async () => {
      const repo = makeRepo();
      await createStatsService(repo).getEventStats(superAdmin, "all", "team-1");
      const calls = (repo.countEvents as jest.Mock).mock.calls;
      expect(calls).toHaveLength(4);
      for (const [where] of calls)
        expect(where).toMatchObject({ teamId: "team-1", deletedAt: null });
    });

    it("leaves counts unscoped when no (or a blank) team is given", async () => {
      const repo = makeRepo();
      await createStatsService(repo).getEventStats(superAdmin, "all", "   ");
      for (const [where] of (repo.countEvents as jest.Mock).mock.calls) {
        expect(where).not.toHaveProperty("teamId");
      }
    });
  });

  describe("getDashboardStats", () => {
    it("counts a coach's distinct teams from their events, not all active teams", async () => {
      const repo = makeRepo({
        findDistinctEventTeamIds: jest.fn().mockResolvedValue([{ teamId: "t1" }, { teamId: "t2" }]),
      });
      const result = (await createStatsService(repo).getDashboardStats(coach, "all")).metrics;
      expect(result.activeTeams).toBe(2);
      expect(repo.countTeams).not.toHaveBeenCalled();
      expect(repo.findDistinctEventTeamIds).toHaveBeenCalledWith({
        coaches: { some: { coachUserId: "c-1", isActive: true } },
      });
    });

    it("counts all active teams for admins", async () => {
      const repo = makeRepo({ countTeams: jest.fn().mockResolvedValue(7) });
      const result = (await createStatsService(repo).getDashboardStats(superAdmin, "all")).metrics;
      expect(result.activeTeams).toBe(7);
      expect(repo.findDistinctEventTeamIds).not.toHaveBeenCalled();
    });
  });

  describe("getTeamPerformance", () => {
    it("aggregates per-team status counts, includes idle teams, and sorts by total", async () => {
      const repo = makeRepo({
        findTeamNames: jest.fn().mockResolvedValue([
          { id: "a", name: "Alpha" },
          { id: "b", name: "Beta" },
          { id: "c", name: "Idle" },
        ]),
        groupBookingsByTeamAndStatus: jest.fn().mockResolvedValue([
          { teamId: "a", status: BookingStatus.COMPLETED, _count: { id: 2 } },
          { teamId: "a", status: BookingStatus.CANCELLED, _count: { id: 1 } },
          { teamId: "b", status: BookingStatus.NO_SHOW, _count: { id: 5 } },
        ]),
      });
      const result = (await createStatsService(repo).getTeamPerformance(superAdmin, "all")).metrics;
      expect(result.performance).toEqual([
        { teamId: "b", name: "Beta", total: 5, completed: 0, cancelled: 0, noShow: 5 },
        { teamId: "a", name: "Alpha", total: 3, completed: 2, cancelled: 1, noShow: 0 },
        { teamId: "c", name: "Idle", total: 0, completed: 0, cancelled: 0, noShow: 0 },
      ]);
    });
  });

  describe("getPeakActivity", () => {
    it("always returns all 24 hours, bucketing bookings by local hour", async () => {
      const repo = makeRepo({
        findBookingStarts: jest
          .fn()
          .mockResolvedValue([
            { startTime: new Date(2026, 5, 1, 9, 5) },
            { startTime: new Date(2026, 5, 2, 9, 45) },
            { startTime: new Date(2026, 5, 2, 14, 0) },
          ]),
      });
      const result = (await createStatsService(repo).getPeakActivity(coach, "all")).metrics;
      expect(result.activity).toHaveLength(24);
      expect(result.activity.find((a) => a.hour === 9)?.count).toBe(2);
      expect(result.activity.find((a) => a.hour === 14)?.count).toBe(1);
      expect(result.activity.find((a) => a.hour === 3)?.count).toBe(0);
      expect((repo.findBookingStarts as jest.Mock).mock.calls[0][0]).toMatchObject({
        coachUserId: "c-1",
      });
    });
  });

  describe("getBookingTrends", () => {
    it("tallies bookings per day by status", async () => {
      const repo = makeRepo({
        findBookingStartsWithStatus: jest.fn().mockResolvedValue([
          { startTime: new Date("2026-06-01T10:00:00.000Z"), status: BookingStatus.COMPLETED },
          { startTime: new Date("2026-06-01T11:00:00.000Z"), status: BookingStatus.CANCELLED },
          { startTime: new Date("2026-06-01T12:00:00.000Z"), status: BookingStatus.NO_SHOW },
        ]),
      });
      const result = (await createStatsService(repo).getBookingTrends(superAdmin, "all")).metrics;
      expect(result.trends).toContainEqual({
        date: "2026-06-01",
        count: 3,
        completed: 1,
        noShow: 1,
        cancelled: 1,
      });
    });
  });
});
