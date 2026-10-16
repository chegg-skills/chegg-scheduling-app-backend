import { CommunicationStatus, UserRole } from "@prisma/client";
import { createStudentService } from "../../src/domain/students/student.service";
import type { StudentRepository } from "../../src/domain/students/student.repository";
import { ErrorHandler } from "../../src/shared/error/errorhandler";
import type { CallerContext } from "../../src/shared/utils/userUtils";
import { publishNotificationSafely } from "../../src/shared/notifications/notification.publisher";

jest.mock("../../src/shared/notifications/notification.publisher", () => ({
  publishNotificationSafely: jest.fn().mockResolvedValue(undefined),
  resolveFrontendUrl: jest.fn().mockReturnValue("http://localhost:3000"),
}));

const superAdmin = { id: "sa-1", role: UserRole.SUPER_ADMIN } as CallerContext;
const teamAdmin = { id: "ta-1", role: UserRole.TEAM_ADMIN } as CallerContext;
const coach = { id: "c-1", role: UserRole.COACH } as CallerContext;

const summary = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "st-1",
    fullName: "Sam Student",
    email: "sam@example.com",
    firstBookedAt: null,
    lastBookedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    bookings: [],
    _count: { bookings: 2 },
    ...overrides,
  }) as never;

const makeRepo = (overrides: Partial<StudentRepository> = {}): StudentRepository => ({
  findManyWithCount: jest.fn().mockResolvedValue([[], 0]),
  findFirstSummary: jest.fn().mockResolvedValue(summary()),
  findBookingsWithCount: jest.fn().mockResolvedValue([[], 0]),
  findBookingsWithSessionLogs: jest.fn().mockResolvedValue([]),
  createCommunicationLog: jest.fn().mockImplementation(async (data) => ({
    id: "log-1",
    ...data,
    sentBy: { firstName: "Ada", lastName: "L" },
  })),
  findCommunicationLogs: jest.fn().mockResolvedValue([]),
  findCommunicationLogById: jest.fn().mockResolvedValue(null),
  resetCommunicationLogToPending: jest.fn().mockImplementation(async () => ({
    id: "log-1",
    subject: "S",
    body: "<p>B</p>",
    sentBy: { firstName: "Ada", lastName: "L" },
  })),
  ...overrides,
});

const statusOf = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ErrorHandler);
  return (error as ErrorHandler).statusCode;
};

describe("createStudentService (fake repository)", () => {
  describe("access scoping", () => {
    const whereFor = async (caller: CallerContext, options = {}) => {
      const repo = makeRepo();
      await createStudentService(repo).listStudents(caller, options);
      return (repo.findManyWithCount as jest.Mock).mock.calls[0][0].where;
    };

    it("leaves a SUPER_ADMIN unrestricted", async () => {
      expect(await whereFor(superAdmin)).toEqual({});
    });

    it("limits a TEAM_ADMIN to students booked on teams they lead or belong to", async () => {
      expect(await whereFor(teamAdmin)).toEqual({
        AND: [
          {
            bookings: {
              some: {
                team: {
                  OR: [
                    { teamLeadId: "ta-1" },
                    { members: { some: { userId: "ta-1", isActive: true } } },
                  ],
                },
              },
            },
          },
        ],
      });
    });

    it("limits a COACH to students they have coached", async () => {
      expect(await whereFor(coach)).toEqual({
        AND: [{ bookings: { some: { coachUserId: "c-1" } } }],
      });
    });

    it("ignores a coach's attempt to filter by another coach, but honours it for admins", async () => {
      const asCoach = await whereFor(coach, { coachUserId: "someone-else" });
      expect(JSON.stringify(asCoach)).not.toContain("someone-else");

      const asAdmin = await whereFor(superAdmin, { coachUserId: "someone-else" });
      expect(asAdmin).toEqual({ AND: [{ bookings: { some: { coachUserId: "someone-else" } } }] });
    });

    it("adds a case-insensitive name/email search and team/event filters", async () => {
      const where = await whereFor(superAdmin, { search: "  sam ", teamId: "t-1", eventId: "e-1" });
      expect(where.AND).toHaveLength(2);
      expect(where.AND[0].OR[0].fullName).toEqual({ contains: "sam", mode: "insensitive" });
      expect(where.AND[1]).toEqual({ bookings: { some: { teamId: "t-1", eventId: "e-1" } } });
    });
  });

  describe("listStudents", () => {
    it("maps rows and computes pagination with a default page size of 25", async () => {
      const repo = makeRepo({ findManyWithCount: jest.fn().mockResolvedValue([[summary()], 60]) });
      const result = await createStudentService(repo).listStudents(superAdmin);
      expect(result.students[0]).toMatchObject({
        id: "st-1",
        bookingCount: 2,
        latestBooking: null,
      });
      expect(result.pagination).toEqual({ page: 1, pageSize: 25, total: 60, totalPages: 3 });
    });
  });

  describe("readStudent", () => {
    it("400s on a blank id and 404s when the caller cannot see the student", async () => {
      const service = createStudentService(
        makeRepo({ findFirstSummary: jest.fn().mockResolvedValue(null) }),
      );
      expect(await statusOf(service.readStudent("   ", superAdmin))).toBe(400);
      expect(await statusOf(service.readStudent("st-1", coach))).toBe(404);
    });

    it("combines the id with the caller's access filter", async () => {
      const repo = makeRepo();
      await createStudentService(repo).readStudent(" st-1 ", coach);
      expect(repo.findFirstSummary).toHaveBeenCalledWith({
        id: "st-1",
        AND: [{ bookings: { some: { coachUserId: "c-1" } } }],
      });
    });
  });

  describe("listStudentBookings", () => {
    it("checks the caller can see the student, then scopes bookings to the caller", async () => {
      const repo = makeRepo();
      await createStudentService(repo).listStudentBookings("st-1", coach);
      expect(repo.findFirstSummary).toHaveBeenCalled();
      expect((repo.findBookingsWithCount as jest.Mock).mock.calls[0][0].where).toEqual({
        studentId: "st-1",
        coachUserId: "c-1",
      });
    });

    it("never queries bookings when the student is not visible", async () => {
      const repo = makeRepo({ findFirstSummary: jest.fn().mockResolvedValue(null) });
      expect(await statusOf(createStudentService(repo).listStudentBookings("st-1", coach))).toBe(
        404,
      );
      expect(repo.findBookingsWithCount).not.toHaveBeenCalled();
    });
  });

  describe("listStudentSessionLogs", () => {
    const log = (overrides = {}) => ({
      id: "l-1",
      topicsDiscussed: "t",
      summary: "s",
      coachNotes: "private",
      updatedAt: new Date(),
      loggedBy: { id: "u", firstName: "A", lastName: "B" },
      ...overrides,
    });
    const booking = (overrides = {}) => ({
      id: "b-1",
      startTime: new Date(),
      event: { name: "Ev", interactionType: "ONE_TO_ONE" },
      coach: { firstName: "Ada", lastName: "L" },
      sessionAttendance: { attended: true },
      sessionLog: log(),
      scheduleSlot: null,
      ...overrides,
    });

    it("shows private coach notes to admins but hides them from coaches", async () => {
      const repo = makeRepo({
        findBookingsWithSessionLogs: jest.fn().mockResolvedValue([booking()]),
      });
      const service = createStudentService(repo);
      expect((await service.listStudentSessionLogs("st-1", superAdmin))[0].coachNotes).toBe(
        "private",
      );
      expect((await service.listStudentSessionLogs("st-1", teamAdmin))[0].coachNotes).toBe(
        "private",
      );
      expect((await service.listStudentSessionLogs("st-1", coach))[0].coachNotes).toBeNull();
    });

    it("uses the student's own attendance for 1:1 logs and the slot roster for group logs", async () => {
      const group = booking({
        id: "b-2",
        sessionLog: null,
        sessionAttendance: null,
        scheduleSlot: {
          sessionLog: log({
            id: "l-2",
            attendance: [
              { bookingId: "other", attended: true },
              { bookingId: "b-2", attended: false },
            ],
          }),
        },
      });
      const repo = makeRepo({
        findBookingsWithSessionLogs: jest.fn().mockResolvedValue([booking(), group]),
      });
      const entries = await createStudentService(repo).listStudentSessionLogs("st-1", superAdmin);
      expect(entries.map((e) => [e.bookingId, e.isGroupSession, e.attended])).toEqual([
        ["b-1", false, true],
        ["b-2", true, false],
      ]);
    });

    it("skips bookings that have no log at all", async () => {
      const repo = makeRepo({
        findBookingsWithSessionLogs: jest.fn().mockResolvedValue([booking({ sessionLog: null })]),
      });
      expect(await createStudentService(repo).listStudentSessionLogs("st-1", superAdmin)).toEqual(
        [],
      );
    });
  });

  describe("sendStudentEmail", () => {
    beforeEach(() => (publishNotificationSafely as jest.Mock).mockClear());

    it("sanitises the body, stores a PENDING log, and publishes keyed by the log id", async () => {
      const repo = makeRepo();
      await createStudentService(repo).sendStudentEmail(
        "st-1",
        "  Hello  ",
        "<p>Hi</p><script>alert(1)</script>",
        coach,
      );

      const data = (repo.createCommunicationLog as jest.Mock).mock.calls[0][0];
      expect(data).toMatchObject({
        studentId: "st-1",
        subject: "Hello",
        status: CommunicationStatus.PENDING,
        sentById: "c-1",
      });
      expect(data.body).not.toContain("<script");

      expect(publishNotificationSafely).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "STUDENT_CUSTOM_EMAIL",
          recipients: "sam@example.com",
          notificationKey: "log-1",
          userId: "c-1",
        }),
      );
    });

    it("does nothing when the student is not visible to the caller", async () => {
      const repo = makeRepo({ findFirstSummary: jest.fn().mockResolvedValue(null) });
      expect(
        await statusOf(createStudentService(repo).sendStudentEmail("st-1", "S", "<p>B</p>", coach)),
      ).toBe(404);
      expect(repo.createCommunicationLog).not.toHaveBeenCalled();
      expect(publishNotificationSafely).not.toHaveBeenCalled();
    });
  });

  describe("retryEmailDispatch", () => {
    beforeEach(() => (publishNotificationSafely as jest.Mock).mockClear());
    const failedLog = (overrides = {}) =>
      ({
        id: "log-1",
        studentId: "st-1",
        sentById: "c-1",
        status: CommunicationStatus.FAILED,
        ...overrides,
      }) as never;

    it("404s for an unknown log", async () => {
      expect(await statusOf(createStudentService(makeRepo()).retryEmailDispatch("x", coach))).toBe(
        404,
      );
    });

    it("forbids a coach from retrying someone else's email", async () => {
      const repo = makeRepo({
        findCommunicationLogById: jest.fn().mockResolvedValue(failedLog({ sentById: "other" })),
      });
      expect(await statusOf(createStudentService(repo).retryEmailDispatch("log-1", coach))).toBe(
        403,
      );
      expect(repo.resetCommunicationLogToPending).not.toHaveBeenCalled();
    });

    it("only retries FAILED emails", async () => {
      const repo = makeRepo({
        findCommunicationLogById: jest
          .fn()
          .mockResolvedValue(failedLog({ status: CommunicationStatus.PENDING })),
      });
      expect(await statusOf(createStudentService(repo).retryEmailDispatch("log-1", coach))).toBe(
        400,
      );
      expect(publishNotificationSafely).not.toHaveBeenCalled();
    });

    it("resets the same log to PENDING and republishes with the same notification key", async () => {
      const repo = makeRepo({
        findCommunicationLogById: jest.fn().mockResolvedValue(failedLog()),
      });
      await createStudentService(repo).retryEmailDispatch("log-1", coach);
      expect(repo.resetCommunicationLogToPending).toHaveBeenCalledWith("log-1");
      expect(publishNotificationSafely).toHaveBeenCalledWith(
        expect.objectContaining({ notificationKey: "log-1", userId: "c-1" }),
      );
    });
  });
});
