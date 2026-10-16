import { UserRole } from "@prisma/client";
import { createTeamMemberService } from "../../src/domain/teamMembers/teamMember.service";
import type { TeamMemberRepository } from "../../src/domain/teamMembers/teamMember.repository";
import { ErrorHandler } from "../../src/shared/error/errorhandler";
import type { CallerContext } from "../../src/shared/utils/userUtils";
import { getManagedTeam } from "../../src/shared/utils/teamAccess";
import { queueTeamMemberAddedNotification } from "../../src/domain/teamMembers/teamMember.notification";

jest.mock("../../src/shared/utils/teamAccess", () => ({ getManagedTeam: jest.fn() }));
jest.mock("../../src/domain/teamMembers/teamMember.notification", () => ({
  queueTeamMemberAddedNotification: jest.fn().mockResolvedValue(undefined),
}));

const admin = { id: "sa-1", role: UserRole.SUPER_ADMIN } as CallerContext;
const coachCaller = { id: "c-1", role: UserRole.COACH } as CallerContext;

const membership = (overrides: Record<string, unknown> = {}) =>
  ({ id: "m-1", teamId: "t-1", userId: "u-1", isActive: true, ...overrides }) as never;

const makeRepo = (overrides: Partial<TeamMemberRepository> = {}): TeamMemberRepository => ({
  findUserForAssignment: jest
    .fn()
    .mockResolvedValue({ id: "u-1", role: UserRole.COACH, isActive: true }),
  findMembership: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockImplementation(async (teamId, userId) => membership({ teamId, userId })),
  setActive: jest.fn().mockImplementation(async (id, isActive) => membership({ id, isActive })),
  listActive: jest.fn().mockResolvedValue([]),
  findTeamLeadId: jest.fn().mockResolvedValue({ teamLeadId: "someone-else" }),
  countActiveHostAssignments: jest.fn().mockResolvedValue(0),
  groupUpcomingBookingCounts: jest.fn().mockResolvedValue([]),
  groupUpcomingSlotCounts: jest.fn().mockResolvedValue([]),
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

describe("createTeamMemberService (fake repository)", () => {
  beforeEach(() => {
    (getManagedTeam as jest.Mock).mockReset().mockResolvedValue({ id: "t-1" });
    (queueTeamMemberAddedNotification as jest.Mock).mockClear();
  });

  describe("addTeamMembers", () => {
    it("checks team access first and 400s on a missing or empty userIds", async () => {
      const service = createTeamMemberService(makeRepo());
      expect(await statusOf(service.addTeamMembers("t-1", { userIds: [] }, admin))).toBe(400);
      expect(
        await statusOf(service.addTeamMembers("t-1", { userIds: undefined as never }, admin)),
      ).toBe(400);
      expect(getManagedTeam).toHaveBeenCalledWith("t-1", admin);
    });

    it.each([
      ["an unknown user", null],
      ["an inactive user", { id: "u-1", role: UserRole.COACH, isActive: false }],
      ["a SUPER_ADMIN", { id: "u-1", role: UserRole.SUPER_ADMIN, isActive: true }],
    ])("rejects %s with 400 and writes nothing", async (_label, user) => {
      const repo = makeRepo({ findUserForAssignment: jest.fn().mockResolvedValue(user) });
      expect(
        await statusOf(
          createTeamMemberService(repo).addTeamMembers("t-1", { userIds: ["u-1"] }, admin),
        ),
      ).toBe(400);
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.setActive).not.toHaveBeenCalled();
    });

    it("creates a new membership and queues the welcome notification", async () => {
      const repo = makeRepo();
      const result = await createTeamMemberService(repo).addTeamMembers(
        "t-1",
        { userIds: [" u-1 "] },
        admin,
      );
      expect(repo.findUserForAssignment).toHaveBeenCalledWith("u-1"); // trimmed
      expect(repo.create).toHaveBeenCalledWith("t-1", "u-1");
      expect(queueTeamMemberAddedNotification).toHaveBeenCalledWith({
        teamId: "t-1",
        userId: "u-1",
      });
      expect(result).toHaveLength(1);
    });

    it("reactivates an inactive membership and notifies", async () => {
      const repo = makeRepo({
        findMembership: jest.fn().mockResolvedValue(membership({ isActive: false })),
      });
      await createTeamMemberService(repo).addTeamMembers("t-1", { userIds: ["u-1"] }, admin);
      expect(repo.setActive).toHaveBeenCalledWith("m-1", true);
      expect(repo.create).not.toHaveBeenCalled();
      expect(queueTeamMemberAddedNotification).toHaveBeenCalledTimes(1);
    });

    it("returns an already-active membership as-is, with no write and no notification", async () => {
      const existing = membership();
      const repo = makeRepo({ findMembership: jest.fn().mockResolvedValue(existing) });
      const result = await createTeamMemberService(repo).addTeamMembers(
        "t-1",
        { userIds: ["u-1"] },
        admin,
      );
      expect(result).toEqual([existing]);
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.setActive).not.toHaveBeenCalled();
      expect(queueTeamMemberAddedNotification).not.toHaveBeenCalled();
    });

    it("skips blank ids and processes the rest in order", async () => {
      const repo = makeRepo();
      const result = await createTeamMemberService(repo).addTeamMembers(
        "t-1",
        { userIds: ["u-1", "   ", "u-2"] },
        admin,
      );
      expect(result).toHaveLength(2);
      expect((repo.create as jest.Mock).mock.calls.map((c) => c[1])).toEqual(["u-1", "u-2"]);
    });

    it("addTeamMember delegates to the batch path and returns the first result", async () => {
      const repo = makeRepo();
      const result = await createTeamMemberService(repo).addTeamMember(
        "t-1",
        { userId: "u-1" },
        admin,
      );
      expect(repo.create).toHaveBeenCalledWith("t-1", "u-1");
      expect(result).toMatchObject({ userId: "u-1" });
    });
  });

  describe("listTeamMembers", () => {
    it("lets a COACH list their team's members and passes the right access flags", async () => {
      const repo = makeRepo({ listActive: jest.fn().mockResolvedValue([membership()]) });
      const result = await createTeamMemberService(repo).listTeamMembers("t-1", coachCaller);
      expect(getManagedTeam).toHaveBeenCalledWith("t-1", coachCaller, {
        allowInactive: true,
        allowCoachMember: true,
      });
      expect(result.members).toHaveLength(1);
    });

    it("does not grant the coach-member allowance to admins", async () => {
      await createTeamMemberService(makeRepo()).listTeamMembers("t-1", admin);
      expect(getManagedTeam).toHaveBeenCalledWith("t-1", admin, {
        allowInactive: true,
        allowCoachMember: false,
      });
    });
  });

  describe("removeTeamMember", () => {
    const remove = (repo: TeamMemberRepository, userId = "u-1") =>
      createTeamMemberService(repo).removeTeamMember("t-1", userId, admin);

    it("400s on a blank user id", async () => {
      expect(await statusOf(remove(makeRepo(), "  "))).toBe(400);
    });

    it("404s when the user is not a member, 409s when already inactive", async () => {
      expect(await statusOf(remove(makeRepo()))).toBe(404);
      const inactive = makeRepo({
        findMembership: jest.fn().mockResolvedValue(membership({ isActive: false })),
      });
      expect(await statusOf(remove(inactive))).toBe(409);
    });

    it("refuses to remove the team lead", async () => {
      const repo = makeRepo({
        findMembership: jest.fn().mockResolvedValue(membership()),
        findTeamLeadId: jest.fn().mockResolvedValue({ teamLeadId: "u-1" }),
      });
      expect(await statusOf(remove(repo))).toBe(409);
      expect(repo.setActive).not.toHaveBeenCalled();
    });

    it("refuses (403) while the user still hosts active events on the team", async () => {
      const repo = makeRepo({
        findMembership: jest.fn().mockResolvedValue(membership()),
        countActiveHostAssignments: jest.fn().mockResolvedValue(2),
      });
      expect(await statusOf(remove(repo))).toBe(403);
      expect(repo.countActiveHostAssignments).toHaveBeenCalledWith("u-1", "t-1");
      expect(repo.setActive).not.toHaveBeenCalled();
    });

    it("deactivates (soft-removes) an eligible member", async () => {
      const repo = makeRepo({ findMembership: jest.fn().mockResolvedValue(membership()) });
      const result = await remove(repo);
      expect(repo.setActive).toHaveBeenCalledWith("m-1", false);
      expect(result).toMatchObject({ isActive: false });
    });
  });

  describe("getTeamMemberWorkload", () => {
    it("adds individual bookings and group slots per coach, skipping unassigned rows", async () => {
      const repo = makeRepo({
        groupUpcomingBookingCounts: jest.fn().mockResolvedValue([
          { coachUserId: "a", _count: { coachUserId: 2 } },
          { coachUserId: null, _count: { coachUserId: 9 } },
        ]),
        groupUpcomingSlotCounts: jest.fn().mockResolvedValue([
          { assignedCoachId: "a", _count: { assignedCoachId: 3 } },
          { assignedCoachId: "b", _count: { assignedCoachId: 1 } },
          { assignedCoachId: null, _count: { assignedCoachId: 7 } },
        ]),
      });
      const result = await createTeamMemberService(repo).getTeamMemberWorkload("t-1", coachCaller);
      expect(result).toEqual([
        { userId: "a", sessionCount: 5 },
        { userId: "b", sessionCount: 1 },
      ]);
      expect(getManagedTeam).toHaveBeenCalledWith("t-1", coachCaller, {
        allowInactive: true,
        allowCoachMember: true,
      });
    });

    it("uses one 'now' for both queries", async () => {
      const repo = makeRepo();
      await createTeamMemberService(repo).getTeamMemberWorkload("t-1", admin);
      const nowA = (repo.groupUpcomingBookingCounts as jest.Mock).mock.calls[0][1];
      const nowB = (repo.groupUpcomingSlotCounts as jest.Mock).mock.calls[0][1];
      expect(nowA).toBe(nowB);
    });
  });
});
