import { Prisma, UserRole } from "@prisma/client";
import { createTeamService } from "../../src/domain/teams/team.service";
import type { TeamRepository } from "../../src/domain/teams/team.repository";
import type { TxRunner } from "../../src/shared/db/transaction";
import { ErrorHandler } from "../../src/shared/error/errorhandler";
import type { CallerContext } from "../../src/shared/utils/userUtils";
import { getManagedTeam } from "../../src/shared/utils/teamAccess";

jest.mock("../../src/shared/utils/teamAccess", () => ({ getManagedTeam: jest.fn() }));

const superAdmin = { id: "sa-1", role: UserRole.SUPER_ADMIN } as CallerContext;
const teamAdmin = { id: "ta-1", role: UserRole.TEAM_ADMIN } as CallerContext;
const coach = { id: "c-1", role: UserRole.COACH } as CallerContext;

const LEAD_ID = "11111111-1111-4111-8111-111111111111";
const goodLead = { role: UserRole.TEAM_ADMIN, isActive: true };

const team = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "t-1",
    name: "Team",
    publicBookingSlug: "team-abc",
    teamLeadId: LEAD_ID,
    ...overrides,
  }) as never;

const makeRepo = (overrides: Partial<TeamRepository> = {}): TeamRepository => ({
  findUserRoleAndStatus: jest.fn().mockResolvedValue(goodLead),
  create: jest.fn().mockImplementation(async (data) => team({ ...data, id: "t-new" })),
  upsertLeadMembership: jest.fn().mockResolvedValue(undefined),
  findManyWithCount: jest.fn().mockResolvedValue([[], 0]),
  findActiveWithLead: jest.fn().mockResolvedValue(team()),
  findActive: jest.fn().mockResolvedValue(team()),
  update: jest.fn().mockImplementation(async (id, data) => team({ id, ...data })),
  softDeleteWithChildren: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

// Runs the callback with a sentinel tx so tests can prove it is threaded through.
const fakeTx = { __fake: true } as never;
const makeTxRunner = (): TxRunner => ({ run: jest.fn((fn) => fn(fakeTx)) });

const statusOf = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ErrorHandler);
  return (error as ErrorHandler).statusCode;
};

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("boom", { code, clientVersion: "test" });

describe("createTeamService (fake repository + fake tx runner)", () => {
  beforeEach(() => (getManagedTeam as jest.Mock).mockReset().mockResolvedValue({ id: "t-1" }));

  describe("createTeam", () => {
    const payload = { name: "Alpha", teamLeadId: LEAD_ID };

    it.each([
      ["no such user", null],
      ["an inactive user", { role: UserRole.TEAM_ADMIN, isActive: false }],
      ["a non-TEAM_ADMIN", { role: UserRole.COACH, isActive: true }],
    ])("400s when the team lead is %s, before opening a transaction", async (_label, lead) => {
      const repo = makeRepo({ findUserRoleAndStatus: jest.fn().mockResolvedValue(lead) });
      const txRunner = makeTxRunner();
      expect(
        await statusOf(createTeamService(repo, txRunner).createTeam(payload, superAdmin)),
      ).toBe(400);
      expect(txRunner.run).not.toHaveBeenCalled();
      expect(repo.create).not.toHaveBeenCalled();
    });

    it("creates the team and the lead's membership in one transaction, threading tx", async () => {
      const repo = makeRepo();
      const txRunner = makeTxRunner();
      await createTeamService(repo, txRunner).createTeam(payload, superAdmin);

      expect(txRunner.run).toHaveBeenCalledTimes(1);
      const [data, createTx] = (repo.create as jest.Mock).mock.calls[0];
      expect(data).toMatchObject({
        name: "alpha",
        teamLeadId: LEAD_ID,
        createdById: "sa-1",
        isActive: true,
      });
      expect(data.publicBookingSlug).toEqual(expect.any(String));
      expect(createTx).toBe(fakeTx);
      expect(repo.upsertLeadMembership).toHaveBeenCalledWith("t-new", LEAD_ID, fakeTx);
    });

    it("trims and lower-cases the team name (schema normalisation)", async () => {
      const repo = makeRepo();
      await createTeamService(repo, makeTxRunner()).createTeam(
        { name: "  Mixed CASE  ", teamLeadId: LEAD_ID },
        superAdmin,
      );
      expect((repo.create as jest.Mock).mock.calls[0][0].name).toBe("mixed case");
    });

    it("maps a duplicate name (P2002) to 409", async () => {
      const repo = makeRepo({ create: jest.fn().mockRejectedValue(prismaError("P2002")) });
      expect(
        await statusOf(createTeamService(repo, makeTxRunner()).createTeam(payload, superAdmin)),
      ).toBe(409);
    });
  });

  describe("listTeams", () => {
    const whereFor = async (caller: CallerContext) => {
      const repo = makeRepo();
      await createTeamService(repo, makeTxRunner()).listTeams({}, caller);
      return (repo.findManyWithCount as jest.Mock).mock.calls[0][0].where;
    };

    it("shows a SUPER_ADMIN every live team", async () => {
      expect(await whereFor(superAdmin)).toEqual({ deletedAt: null });
    });
    it("limits a TEAM_ADMIN to teams they lead", async () => {
      expect(await whereFor(teamAdmin)).toEqual({ deletedAt: null, teamLeadId: "ta-1" });
    });
    it("limits a COACH to teams where they are an active member", async () => {
      expect(await whereFor(coach)).toEqual({
        deletedAt: null,
        members: { some: { userId: "c-1", isActive: true } },
      });
    });

    it("computes pagination", async () => {
      const repo = makeRepo({ findManyWithCount: jest.fn().mockResolvedValue([[team()], 45]) });
      const result = await createTeamService(repo, makeTxRunner()).listTeams(
        { page: 1, pageSize: 20 },
        superAdmin,
      );
      expect(result.pagination).toEqual({ page: 1, pageSize: 20, total: 45, totalPages: 3 });
    });
  });

  describe("readTeam", () => {
    it("checks managed-team access only when a caller is supplied", async () => {
      const service = createTeamService(makeRepo(), makeTxRunner());
      await service.readTeam("t-1", coach);
      expect(getManagedTeam).toHaveBeenCalledWith("t-1", coach, {
        allowCoachMember: true,
        allowInactive: true,
      });

      (getManagedTeam as jest.Mock).mockClear();
      await service.readTeam("t-1");
      expect(getManagedTeam).not.toHaveBeenCalled();
    });

    it("404s for a missing or soft-deleted team", async () => {
      const repo = makeRepo({ findActiveWithLead: jest.fn().mockResolvedValue(null) });
      expect(
        await statusOf(createTeamService(repo, makeTxRunner()).readTeam("x", superAdmin)),
      ).toBe(404);
    });
  });

  describe("updateTeam", () => {
    it("404s for an unknown team without writing", async () => {
      const repo = makeRepo({ findActiveWithLead: jest.fn().mockResolvedValue(null) });
      expect(
        await statusOf(createTeamService(repo, makeTxRunner()).updateTeam("x", { name: "N" })),
      ).toBe(404);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it("backfills a missing public booking slug when the name changes", async () => {
      const repo = makeRepo({
        findActiveWithLead: jest.fn().mockResolvedValue(team({ publicBookingSlug: null })),
      });
      await createTeamService(repo, makeTxRunner()).updateTeam("t-1", { name: "Renamed" });
      const data = (repo.update as jest.Mock).mock.calls[0][1];
      expect(data.name).toBe("renamed");
      expect(data.publicBookingSlug).toEqual(expect.any(String));
    });

    it("keeps an existing slug when renaming", async () => {
      const repo = makeRepo();
      await createTeamService(repo, makeTxRunner()).updateTeam("t-1", { name: "Renamed" });
      expect((repo.update as jest.Mock).mock.calls[0][1]).not.toHaveProperty("publicBookingSlug");
    });

    it("does not touch memberships unless the lead changes", async () => {
      const repo = makeRepo();
      await createTeamService(repo, makeTxRunner()).updateTeam("t-1", { description: "d" });
      expect(repo.upsertLeadMembership).not.toHaveBeenCalled();
    });

    it("reassigns the lead and upserts their membership in the same transaction", async () => {
      const repo = makeRepo();
      const txRunner = makeTxRunner();
      await createTeamService(repo, txRunner).updateTeam("t-1", { teamLeadId: LEAD_ID });

      expect(repo.findUserRoleAndStatus).toHaveBeenCalledWith(LEAD_ID);
      expect(repo.update).toHaveBeenCalledWith(
        "t-1",
        { teamLead: { connect: { id: LEAD_ID } } },
        fakeTx,
      );
      expect(repo.upsertLeadMembership).toHaveBeenCalledWith("t-1", LEAD_ID, fakeTx);
    });

    it("rejects an invalid new lead before writing", async () => {
      const repo = makeRepo({ findUserRoleAndStatus: jest.fn().mockResolvedValue(null) });
      expect(
        await statusOf(
          createTeamService(repo, makeTxRunner()).updateTeam("t-1", { teamLeadId: LEAD_ID }),
        ),
      ).toBe(400);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it("maps P2025 to 404 and P2002 to 409", async () => {
      for (const [code, expected] of [
        ["P2025", 404],
        ["P2002", 409],
      ] as const) {
        const repo = makeRepo({ update: jest.fn().mockRejectedValue(prismaError(code)) });
        expect(
          await statusOf(createTeamService(repo, makeTxRunner()).updateTeam("t-1", { name: "N" })),
        ).toBe(expected);
      }
    });
  });

  describe("deleteTeam", () => {
    it("404s for an unknown team and never cascades", async () => {
      const repo = makeRepo({ findActive: jest.fn().mockResolvedValue(null) });
      expect(await statusOf(createTeamService(repo, makeTxRunner()).deleteTeam("x"))).toBe(404);
      expect(repo.softDeleteWithChildren).not.toHaveBeenCalled();
    });

    it("cascades once and returns the team that was deleted", async () => {
      const repo = makeRepo();
      const result = await createTeamService(repo, makeTxRunner()).deleteTeam("t-1");
      expect(repo.softDeleteWithChildren).toHaveBeenCalledTimes(1);
      expect(repo.softDeleteWithChildren).toHaveBeenCalledWith("t-1");
      expect(result).toMatchObject({ id: "t-1" });
    });
  });
});
