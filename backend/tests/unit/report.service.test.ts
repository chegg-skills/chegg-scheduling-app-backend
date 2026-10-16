import { BookingStatus, UserRole } from "@prisma/client";
import { createReportService } from "../../src/domain/reports/report.service";
import type { ReportRepository } from "../../src/domain/reports/report.repository";
import { ErrorHandler } from "../../src/shared/error/errorhandler";
import type { CallerContext } from "../../src/shared/utils/userUtils";

const superAdmin = { id: "sa-1", role: UserRole.SUPER_ADMIN } as CallerContext;
const teamAdmin = { id: "ta-1", role: UserRole.TEAM_ADMIN } as CallerContext;
const coach = { id: "c-1", role: UserRole.COACH } as CallerContext;

const makeRepo = (overrides: Partial<ReportRepository> = {}): ReportRepository => ({
  findBookings: jest.fn().mockResolvedValue([]),
  findCoaches: jest.fn().mockResolvedValue([]),
  groupSlotSessions: jest.fn().mockResolvedValue([]),
  groupIndividualSessions: jest.fn().mockResolvedValue([]),
  findStudents: jest.fn().mockResolvedValue([]),
  ...overrides,
});

const teamScope = { team: { teamLeadId: "ta-1" } };

describe("createReportService (fake repository)", () => {
  it("rejects coaches on every report before querying", async () => {
    const repo = makeRepo();
    const service = createReportService(repo);

    for (const run of [
      () => service.getBookingsReport(coach),
      () => service.getPerformanceReport(coach),
      () => service.getStudentReport(coach),
    ]) {
      const error = await run().then(
        () => undefined,
        (e: unknown) => e,
      );
      expect(error).toBeInstanceOf(ErrorHandler);
    }
    expect(repo.findBookings).not.toHaveBeenCalled();
    expect(repo.findCoaches).not.toHaveBeenCalled();
    expect(repo.findStudents).not.toHaveBeenCalled();
  });

  describe("bookings report", () => {
    it("scopes a TEAM_ADMIN to teams they lead; a SUPER_ADMIN is unscoped", async () => {
      const repo = makeRepo();
      const service = createReportService(repo);
      await service.getBookingsReport(teamAdmin, "all");
      await service.getBookingsReport(superAdmin, "all");

      const [adminWhere, superWhere] = (repo.findBookings as jest.Mock).mock.calls.map((c) => c[0]);
      expect(adminWhere).toMatchObject(teamScope);
      expect(superWhere).not.toHaveProperty("team");
    });

    it("builds the CSV row from the booking", async () => {
      const start = new Date("2026-06-01T10:00:00.000Z");
      const repo = makeRepo({
        findBookings: jest.fn().mockResolvedValue([
          {
            id: "b-1",
            startTime: start,
            endTime: new Date(start.getTime() + 30 * 60000),
            status: BookingStatus.CONFIRMED,
            team: { name: "Team A" },
            event: { name: "Intro", eventType: null },
            coach: { firstName: "Ada", lastName: "L" },
            studentName: "Sam",
            studentEmail: "sam@example.com",
            sessionObjectives: null,
            specificQuestion: null,
            notes: null,
          },
        ]),
      });
      const result = await createReportService(repo).getBookingsReport(superAdmin, "all");
      expect(result.data[0]).toMatchObject({
        "Booking ID": "b-1",
        Team: "Team A",
        Coach: "Ada L",
        "Duration (Min)": 30,
        "Event Type": "",
      });
      expect(result.filename).toMatch(/^bookings_report_\d{4}-\d{2}-\d{2}\.csv$/);
    });
  });

  describe("performance report", () => {
    it("restricts both the coach roster and the session counts for a TEAM_ADMIN", async () => {
      const repo = makeRepo();
      await createReportService(repo).getPerformanceReport(teamAdmin, "all");

      const coachWhere = (repo.findCoaches as jest.Mock).mock.calls[0][0];
      expect(coachWhere.teamMemberships).toEqual({
        some: { isActive: true, team: { teamLeadId: "ta-1" } },
      });
      expect((repo.groupSlotSessions as jest.Mock).mock.calls[0][0]).toMatchObject(teamScope);
      expect((repo.groupIndividualSessions as jest.Mock).mock.calls[0][0]).toMatchObject(teamScope);
    });

    it("queries slot sessions and slot-less bookings separately", async () => {
      const repo = makeRepo();
      await createReportService(repo).getPerformanceReport(superAdmin, "all");
      expect((repo.groupSlotSessions as jest.Mock).mock.calls[0][0].scheduleSlotId).toEqual({
        not: null,
      });
      expect(
        (repo.groupIndividualSessions as jest.Mock).mock.calls[0][0].scheduleSlotId,
      ).toBeNull();
    });

    it("counts each slot once and adds individual bookings, then computes the rate", async () => {
      const repo = makeRepo({
        findCoaches: jest
          .fn()
          .mockResolvedValue([{ id: "c-1", firstName: "Ada", lastName: "L", email: "a@x.com" }]),
        groupSlotSessions: jest.fn().mockResolvedValue([
          { coachUserId: "c-1", scheduleSlotId: "s1", status: BookingStatus.COMPLETED },
          { coachUserId: "c-1", scheduleSlotId: "s2", status: BookingStatus.NO_SHOW },
        ]),
        groupIndividualSessions: jest
          .fn()
          .mockResolvedValue([
            { coachUserId: "c-1", status: BookingStatus.COMPLETED, _count: { id: 2 } },
          ]),
      });
      const { data } = await createReportService(repo).getPerformanceReport(superAdmin, "all");
      expect(data[0]).toMatchObject({
        "Total Sessions": 4,
        Completed: 3,
        "No-Show": 1,
        Cancelled: 0,
        "Completion Rate (%)": 75,
      });
    });

    it("reports a 0% rate (not NaN) for a coach with no sessions", async () => {
      const repo = makeRepo({
        findCoaches: jest
          .fn()
          .mockResolvedValue([{ id: "c-9", firstName: "N", lastName: "O", email: "n@x.com" }]),
      });
      const { data } = await createReportService(repo).getPerformanceReport(superAdmin, "all");
      expect(data[0]).toMatchObject({ "Total Sessions": 0, "Completion Rate (%)": 0 });
    });
  });

  describe("student report", () => {
    it("scopes students and their session count to the TEAM_ADMIN's teams", async () => {
      const repo = makeRepo();
      await createReportService(repo).getStudentReport(teamAdmin, "all");
      const [where, bookingsCount] = (repo.findStudents as jest.Mock).mock.calls[0];
      expect(where.bookings).toEqual({ some: teamScope });
      expect(bookingsCount).toEqual({ where: teamScope });
    });

    it("counts all bookings, unscoped, for a SUPER_ADMIN", async () => {
      const repo = makeRepo();
      await createReportService(repo).getStudentReport(superAdmin, "all");
      const [where, bookingsCount] = (repo.findStudents as jest.Mock).mock.calls[0];
      expect(where).not.toHaveProperty("bookings");
      expect(bookingsCount).toBe(true);
    });
  });
});
