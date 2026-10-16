import { Prisma, UserRole } from "@prisma/client";
import { createInviteService } from "../../src/domain/invite/invite.service";
import type { InviteRepository } from "../../src/domain/invite/invite.repository";
import { ErrorHandler } from "../../src/shared/error/errorhandler";

const DAY = 24 * 60 * 60 * 1000;

const makeInvite = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "i-1",
    email: "new@example.com",
    role: UserRole.COACH,
    token: "tok",
    requiresSso: false,
    createdBy: "admin-1",
    acceptedAt: null,
    revokedAt: null,
    expiresAt: new Date(Date.now() + DAY),
    createdAt: new Date(),
    createdByUser: { firstName: "A", lastName: "B", email: "a@b.com" },
    ...overrides,
  }) as never;

const makeRepo = (overrides: Partial<InviteRepository> = {}): InviteRepository => ({
  findUserByEmail: jest.fn().mockResolvedValue(null),
  findPendingInviteByEmail: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockImplementation(async (data) => makeInvite(data)),
  findByToken: jest.fn().mockResolvedValue(null),
  findByIdWithCreator: jest.fn().mockResolvedValue(null),
  findManyWithCount: jest.fn().mockResolvedValue([[], 0]),
  markRevoked: jest.fn().mockImplementation(async () => makeInvite({ revokedAt: new Date() })),
  createUserAndAcceptInvite: jest.fn().mockResolvedValue({
    id: "u-1",
    email: "new@example.com",
    role: UserRole.COACH,
    firstName: "N",
    lastName: "U",
    password: "hash",
  }),
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

const acceptPayload = {
  token: "tok",
  firstName: "New",
  lastName: "User",
  password: "Passw0rd!123",
};

describe("createInviteService (fake repository)", () => {
  describe("createInvite", () => {
    const base = { email: "New@Example.com", role: UserRole.COACH, createdByAdminId: "admin-1" };

    it("only lets a TEAM_ADMIN invite coaches", async () => {
      const service = createInviteService(makeRepo());
      expect(
        await statusOf(
          service.createInvite({
            ...base,
            role: UserRole.TEAM_ADMIN,
            callerRole: UserRole.TEAM_ADMIN,
          }),
        ),
      ).toBe(403);
    });

    it("409s when the email already belongs to a user, or has an active invite", async () => {
      const userExists = createInviteService(
        makeRepo({ findUserByEmail: jest.fn().mockResolvedValue({ id: "u" } as never) }),
      );
      expect(
        await statusOf(userExists.createInvite({ ...base, callerRole: UserRole.SUPER_ADMIN })),
      ).toBe(409);

      const inviteExists = createInviteService(
        makeRepo({ findPendingInviteByEmail: jest.fn().mockResolvedValue(makeInvite()) }),
      );
      expect(
        await statusOf(inviteExists.createInvite({ ...base, callerRole: UserRole.SUPER_ADMIN })),
      ).toBe(409);
    });

    it("normalises the email, defaults requiresSso to false, and sets a future expiry", async () => {
      const repo = makeRepo();
      await createInviteService(repo).createInvite({ ...base, callerRole: UserRole.SUPER_ADMIN });

      expect(repo.findUserByEmail).toHaveBeenCalledWith("new@example.com");
      const data = (repo.create as jest.Mock).mock.calls[0][0];
      expect(data).toMatchObject({
        email: "new@example.com",
        role: UserRole.COACH,
        createdBy: "admin-1",
        requiresSso: false,
      });
      expect(data.token).toMatch(/^[0-9a-f]{64}$/);
      expect(data.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("acceptInvite", () => {
    it("rejects unknown, used, expired and SSO-only invites with the right status", async () => {
      const cases: Array<[Record<string, unknown> | null, number]> = [
        [null, 404],
        [{ acceptedAt: new Date() }, 409],
        [{ expiresAt: new Date(Date.now() - DAY) }, 410],
        [{ requiresSso: true }, 400],
      ];
      for (const [overrides, expected] of cases) {
        const repo = makeRepo({
          findByToken: jest.fn().mockResolvedValue(overrides ? makeInvite(overrides) : null),
        });
        expect(await statusOf(createInviteService(repo).acceptInvite(acceptPayload))).toBe(
          expected,
        );
        expect(repo.createUserAndAcceptInvite).not.toHaveBeenCalled();
      }
    });

    it("409s when a user with the invite's email already exists", async () => {
      const repo = makeRepo({
        findByToken: jest.fn().mockResolvedValue(makeInvite()),
        findUserByEmail: jest.fn().mockResolvedValue({ id: "u" } as never),
      });
      expect(await statusOf(createInviteService(repo).acceptInvite(acceptPayload))).toBe(409);
    });

    it("maps a unique-email race (P2002) to 409", async () => {
      const race = new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "test",
      });
      const repo = makeRepo({
        findByToken: jest.fn().mockResolvedValue(makeInvite()),
        createUserAndAcceptInvite: jest.fn().mockRejectedValue(race),
      });
      expect(await statusOf(createInviteService(repo).acceptInvite(acceptPayload))).toBe(409);
    });

    it("creates the user with a hashed password and returns a token plus the inviter", async () => {
      const repo = makeRepo({ findByToken: jest.fn().mockResolvedValue(makeInvite()) });
      const result = await createInviteService(repo).acceptInvite(acceptPayload);

      const [userData, inviteId] = (repo.createUserAndAcceptInvite as jest.Mock).mock.calls[0];
      expect(inviteId).toBe("i-1");
      expect(userData).toMatchObject({
        email: "new@example.com",
        role: UserRole.COACH,
        timezone: "UTC",
      });
      expect(userData.password).not.toBe(acceptPayload.password);
      expect(result.token).toEqual(expect.any(String));
      expect(result.invitedById).toBe("admin-1");
      expect(result.user).not.toHaveProperty("password");
    });
  });

  describe("validateInvite", () => {
    it("reports not_found, already_accepted and expired without leaking details", async () => {
      const check = async (invite: unknown) =>
        createInviteService(
          makeRepo({ findByToken: jest.fn().mockResolvedValue(invite) }),
        ).validateInvite("tok");

      expect(await check(null)).toEqual({ valid: false, reason: "not_found" });
      expect(await check(makeInvite({ acceptedAt: new Date() }))).toEqual({
        valid: false,
        reason: "already_accepted",
      });
      expect(await check(makeInvite({ expiresAt: new Date(Date.now() - DAY) }))).toEqual({
        valid: false,
        reason: "expired",
      });
      expect(await check(makeInvite())).toEqual({
        valid: true,
        email: "new@example.com",
        role: UserRole.COACH,
        requiresSso: false,
      });
    });
  });

  describe("listInvites", () => {
    it("restricts a TEAM_ADMIN to invites they created; a SUPER_ADMIN is unrestricted", async () => {
      const repo = makeRepo();
      const service = createInviteService(repo);
      await service.listInvites({}, "ta-1", UserRole.TEAM_ADMIN);
      await service.listInvites({}, "sa-1", UserRole.SUPER_ADMIN);

      const [adminWhere, superWhere] = (repo.findManyWithCount as jest.Mock).mock.calls.map(
        (c) => c[0].where,
      );
      expect(adminWhere).toMatchObject({ createdBy: "ta-1" });
      expect(superWhere).not.toHaveProperty("createdBy");
    });

    it("translates each status filter into the matching where clause", async () => {
      const repo = makeRepo();
      const service = createInviteService(repo);
      for (const status of ["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"] as const) {
        await service.listInvites({ status }, "sa-1", UserRole.SUPER_ADMIN);
      }
      const wheres = (repo.findManyWithCount as jest.Mock).mock.calls.map((c) => c[0].where);
      expect(wheres[0]).toMatchObject({
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: expect.any(Date) },
      });
      expect(wheres[1]).toMatchObject({ acceptedAt: { not: null } });
      expect(wheres[2]).toMatchObject({
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { lte: expect.any(Date) },
      });
      expect(wheres[3]).toMatchObject({ revokedAt: { not: null } });
    });

    it("derives each row's status and computes pagination", async () => {
      const repo = makeRepo({
        findManyWithCount: jest
          .fn()
          .mockResolvedValue([
            [
              makeInvite({ id: "p" }),
              makeInvite({ id: "a", acceptedAt: new Date() }),
              makeInvite({ id: "r", revokedAt: new Date() }),
              makeInvite({ id: "e", expiresAt: new Date(Date.now() - DAY) }),
            ],
            45,
          ]),
      });
      const result = await createInviteService(repo).listInvites(
        { page: 1, pageSize: 20 },
        "sa-1",
        UserRole.SUPER_ADMIN,
      );
      expect(result.invites.map((i) => [i.id, i.status])).toEqual([
        ["p", "PENDING"],
        ["a", "ACCEPTED"],
        ["r", "REVOKED"],
        ["e", "EXPIRED"],
      ]);
      expect(result.pagination).toEqual({ page: 1, pageSize: 20, total: 45, totalPages: 3 });
    });
  });

  describe("revokeInvite", () => {
    const revoke = (
      invite: unknown,
      callerId = "admin-1",
      role: UserRole = UserRole.SUPER_ADMIN,
    ) => {
      const repo = makeRepo({ findByIdWithCreator: jest.fn().mockResolvedValue(invite) });
      return { repo, run: () => createInviteService(repo).revokeInvite("i-1", callerId, role) };
    };

    it("404s for an unknown invite", async () => {
      expect(await statusOf(revoke(null).run())).toBe(404);
    });

    it("409s for accepted, revoked and expired invites without writing", async () => {
      for (const overrides of [
        { acceptedAt: new Date() },
        { revokedAt: new Date() },
        { expiresAt: new Date(Date.now() - DAY) },
      ]) {
        const { repo, run } = revoke(makeInvite(overrides));
        expect(await statusOf(run())).toBe(409);
        expect(repo.markRevoked).not.toHaveBeenCalled();
      }
    });

    it("lets a TEAM_ADMIN revoke only their own invites", async () => {
      const other = revoke(makeInvite({ createdBy: "someone-else" }), "ta-1", UserRole.TEAM_ADMIN);
      expect(await statusOf(other.run())).toBe(403);
      expect(other.repo.markRevoked).not.toHaveBeenCalled();

      const own = revoke(makeInvite({ createdBy: "ta-1" }), "ta-1", UserRole.TEAM_ADMIN);
      expect((await own.run()).status).toBe("REVOKED");
    });
  });
});
