import bcrypt from "bcrypt";
import { Prisma, UserRole } from "@prisma/client";
import { createAuthService } from "../../src/domain/auth/auth.service";
import type { AuthRepository } from "../../src/domain/auth/auth.repository";
import { ErrorHandler } from "../../src/shared/error/errorhandler";

const PASSWORD = "Passw0rd!123";
const HASH = bcrypt.hashSync(PASSWORD, 4); // low cost: this is a fixture, not production hashing

const user = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "u-1",
    email: "ada@example.com",
    firstName: "Ada",
    lastName: "L",
    role: UserRole.COACH,
    isActive: true,
    password: HASH,
    failedLoginAttempts: 0,
    lockedUntil: null,
    ssoSub: "secret-sub",
    ssoProvider: "okta",
    ...overrides,
  }) as never;

const makeRepo = (overrides: Partial<AuthRepository> = {}): AuthRepository => ({
  findUserByEmail: jest.fn().mockResolvedValue(null),
  findUserById: jest.fn().mockResolvedValue(null),
  countUsers: jest.fn().mockResolvedValue(0),
  createUser: jest.fn().mockImplementation(async (data) => user({ id: "u-new", ...data })),
  recordFailedLogin: jest.fn().mockResolvedValue(undefined),
  recordSuccessfulLogin: jest.fn().mockImplementation(async () => user()),
  ...overrides,
});

const makeDeps = () => ({
  revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
  rotateRefreshToken: jest.fn(),
  revokeAllRefreshTokensForUser: jest.fn().mockResolvedValue(undefined),
});

const make = (repo = makeRepo(), deps = makeDeps()) => ({
  service: createAuthService(repo, deps as never),
  repo,
  deps,
});

const statusOf = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ErrorHandler);
  return (error as ErrorHandler).statusCode;
};

const registerPayload = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "Ada@Example.com",
  password: PASSWORD,
};

describe("createAuthService (fake repository)", () => {
  describe("register", () => {
    it("409s when the email is already taken, without creating anything", async () => {
      const { service, repo } = make(
        makeRepo({ findUserByEmail: jest.fn().mockResolvedValue(user()) }),
      );
      expect(await statusOf(service.register(registerPayload))).toBe(409);
      expect(repo.createUser).not.toHaveBeenCalled();
    });

    it("normalises the email, hashes the password, defaults to COACH/UTC, and strips secrets", async () => {
      const { service, repo } = make();
      const result = await service.register(registerPayload);

      expect(repo.findUserByEmail).toHaveBeenCalledWith("ada@example.com");
      const data = (repo.createUser as jest.Mock).mock.calls[0][0];
      expect(data).toMatchObject({
        email: "ada@example.com",
        role: UserRole.COACH,
        timezone: "UTC",
      });
      expect(data.password).not.toBe(PASSWORD);
      expect(await bcrypt.compare(PASSWORD, data.password)).toBe(true);
      expect(data.publicBookingSlug).toEqual(expect.any(String));
      expect(result.token).toEqual(expect.any(String));
      expect(result.user).not.toHaveProperty("password");
      expect(result.user).not.toHaveProperty("ssoSub");
    });

    it("honours an explicit role", async () => {
      const { service, repo } = make();
      await service.register({ ...registerPayload, role: UserRole.TEAM_ADMIN });
      expect((repo.createUser as jest.Mock).mock.calls[0][0].role).toBe(UserRole.TEAM_ADMIN);
    });

    it("maps a unique-email race (P2002) to 409", async () => {
      const race = new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "test",
      });
      const { service } = make(makeRepo({ createUser: jest.fn().mockRejectedValue(race) }));
      expect(await statusOf(service.register(registerPayload))).toBe(409);
    });
  });

  describe("login", () => {
    const credentials = { email: "ada@example.com", password: PASSWORD };
    const loginWith = (found: unknown, creds = credentials) => {
      const ctx = make(makeRepo({ findUserByEmail: jest.fn().mockResolvedValue(found) }));
      return { ...ctx, run: () => ctx.service.login(creds) };
    };

    it("gives the same 401 for an unknown email and for a wrong password (no account enumeration)", async () => {
      const unknown = await loginWith(null)
        .service.login(credentials)
        .catch((e) => e);
      const wrong = await loginWith(user())
        .service.login({ ...credentials, password: "wrong-password-1" })
        .catch((e) => e);
      expect(unknown.statusCode).toBe(401);
      expect(wrong.statusCode).toBe(401);
      expect(unknown.message).toBe(wrong.message);
    });

    it("403s an inactive account and 423s a locked one, before checking the password", async () => {
      const inactive = loginWith(user({ isActive: false }));
      expect(await statusOf(inactive.run())).toBe(403);

      const locked = loginWith(user({ lockedUntil: new Date(Date.now() + 60_000) }));
      expect(await statusOf(locked.run())).toBe(423);
      expect(locked.repo.recordFailedLogin).not.toHaveBeenCalled();
    });

    it("lets an expired lock through", async () => {
      const { run } = loginWith(user({ lockedUntil: new Date(Date.now() - 60_000) }));
      await expect(run()).resolves.toBeDefined();
    });

    it("400s an SSO-only account (no password) with a pointer to the identity provider", async () => {
      const { run } = loginWith(user({ password: null }));
      expect(await statusOf(run())).toBe(400);
    });

    it("counts a failed attempt without locking below the threshold", async () => {
      const { run, repo } = loginWith(user({ failedLoginAttempts: 1 }), {
        ...credentials,
        password: "wrong-password-1",
      });
      expect(await statusOf(run())).toBe(401);
      expect(repo.recordFailedLogin).toHaveBeenCalledWith("u-1", {
        failedLoginAttempts: 2,
        lockedUntil: null,
      });
    });

    it("locks the account on the fifth failure, resets the counter, and answers 423", async () => {
      const { run, repo } = loginWith(user({ failedLoginAttempts: 4 }), {
        ...credentials,
        password: "wrong-password-1",
      });
      expect(await statusOf(run())).toBe(423);
      const [id, state] = (repo.recordFailedLogin as jest.Mock).mock.calls[0];
      expect(id).toBe("u-1");
      expect(state.failedLoginAttempts).toBe(0);
      expect(state.lockedUntil.getTime()).toBeGreaterThan(Date.now());
    });

    it("clears the counter and lock on success, and returns a token without secrets", async () => {
      const { run, repo } = loginWith(user({ failedLoginAttempts: 3 }));
      const result = await run();
      expect(repo.recordSuccessfulLogin).toHaveBeenCalledWith("u-1", expect.any(Date));
      expect(repo.recordFailedLogin).not.toHaveBeenCalled();
      expect(result.token).toEqual(expect.any(String));
      expect(result.user).not.toHaveProperty("password");
    });
  });

  describe("logout", () => {
    it("revokes the presented refresh token", async () => {
      const { service, deps } = make();
      expect(await service.logout("raw-token")).toEqual({ message: "Logged out successfully." });
      expect(deps.revokeRefreshToken).toHaveBeenCalledWith("raw-token");
    });

    it("succeeds without a token and does not call revoke", async () => {
      const { service, deps } = make();
      await service.logout(undefined);
      expect(deps.revokeRefreshToken).not.toHaveBeenCalled();
    });

    it("stays best-effort: a revoke failure still logs the user out", async () => {
      const deps = makeDeps();
      deps.revokeRefreshToken.mockRejectedValue(new Error("db down"));
      const { service } = make(makeRepo(), deps);
      await expect(service.logout("raw-token")).resolves.toEqual({
        message: "Logged out successfully.",
      });
    });
  });

  describe("refresh", () => {
    it("401s with no cookie, without touching the token store", async () => {
      const { service, deps } = make();
      expect(await statusOf(service.refresh(undefined))).toBe(401);
      expect(deps.rotateRefreshToken).not.toHaveBeenCalled();
    });

    it("401s for reused and invalid tokens, with distinct messages", async () => {
      const reused = makeDeps();
      reused.rotateRefreshToken.mockResolvedValue({ status: "reused" });
      const invalid = makeDeps();
      invalid.rotateRefreshToken.mockResolvedValue({ status: "invalid" });

      const a = await make(makeRepo(), reused)
        .service.refresh("t")
        .catch((e) => e);
      const b = await make(makeRepo(), invalid)
        .service.refresh("t")
        .catch((e) => e);
      expect(a.statusCode).toBe(401);
      expect(b.statusCode).toBe(401);
      expect(a.message).toContain("revoked for security reasons");
      expect(b.message).toContain("Session expired");
    });

    it("passes the request metadata to the rotation", async () => {
      const deps = makeDeps();
      deps.rotateRefreshToken.mockResolvedValue({ status: "invalid" });
      const meta = { userAgent: "UA", ipAddress: "1.2.3.4" };
      await make(makeRepo(), deps)
        .service.refresh("t", meta)
        .catch(() => undefined);
      expect(deps.rotateRefreshToken).toHaveBeenCalledWith("t", meta);
    });

    it("revokes every session of a user who was deactivated or deleted mid-session", async () => {
      for (const found of [null, user({ isActive: false })]) {
        const deps = makeDeps();
        deps.rotateRefreshToken.mockResolvedValue({ status: "ok", userId: "u-1", token: "new" });
        const ctx = make(makeRepo({ findUserById: jest.fn().mockResolvedValue(found) }), deps);
        expect(await statusOf(ctx.service.refresh("t"))).toBe(401);
        expect(deps.revokeAllRefreshTokensForUser).toHaveBeenCalledWith("u-1");
      }
    });

    it("returns a new access token, the rotated refresh token, and a secret-free user", async () => {
      const deps = makeDeps();
      deps.rotateRefreshToken.mockResolvedValue({ status: "ok", userId: "u-1", token: "rotated" });
      const { service } = make(
        makeRepo({ findUserById: jest.fn().mockResolvedValue(user()) }),
        deps,
      );
      const result = await service.refresh("t");
      expect(result.refreshToken).toBe("rotated");
      expect(result.token).toEqual(expect.any(String));
      expect(result.user).not.toHaveProperty("password");
      expect(deps.revokeAllRefreshTokensForUser).not.toHaveBeenCalled();
    });
  });

  describe("bootstrap", () => {
    const SECRET = "bootstrap-secret-value";
    const payload = {
      bootstrapSecret: SECRET,
      firstName: "Root",
      lastName: "Admin",
      email: "root@example.com",
      password: PASSWORD,
    };
    let saved: string | undefined;
    beforeEach(() => {
      saved = process.env.BOOTSTRAP_SECRET;
      process.env.BOOTSTRAP_SECRET = SECRET;
    });
    afterEach(() => {
      if (saved === undefined) delete process.env.BOOTSTRAP_SECRET;
      else process.env.BOOTSTRAP_SECRET = saved;
    });

    it("is disabled (403) when no secret is configured", async () => {
      delete process.env.BOOTSTRAP_SECRET;
      expect(await statusOf(make().service.bootstrap(payload))).toBe(403);
    });

    it("403s a wrong secret, including one of a different length", async () => {
      const { service, repo } = make();
      expect(
        await statusOf(
          service.bootstrap({ ...payload, bootstrapSecret: "x".repeat(SECRET.length) }),
        ),
      ).toBe(403);
      expect(await statusOf(service.bootstrap({ ...payload, bootstrapSecret: "short" }))).toBe(403);
      expect(
        await statusOf(service.bootstrap({ ...payload, bootstrapSecret: undefined as never })),
      ).toBe(403);
      expect(repo.countUsers).not.toHaveBeenCalled();
    });

    it("is permanently closed once any user exists", async () => {
      const { service, repo } = make(makeRepo({ countUsers: jest.fn().mockResolvedValue(1) }));
      expect(await statusOf(service.bootstrap(payload))).toBe(403);
      expect(repo.createUser).not.toHaveBeenCalled();
    });

    it("creates a SUPER_ADMIN and ignores any role in the payload", async () => {
      const { service, repo } = make();
      const result = await service.bootstrap({ ...payload, role: UserRole.COACH } as never);
      expect((repo.createUser as jest.Mock).mock.calls[0][0].role).toBe(UserRole.SUPER_ADMIN);
      expect(result.token).toEqual(expect.any(String));
    });
  });
});
