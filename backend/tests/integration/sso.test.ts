import request from "supertest";

// Mock the OIDC client so the callback never contacts a real identity provider.
// Only this test file is affected — jest's module registry is per-file.
jest.mock("../../src/shared/auth/oidcClient", () => ({
  __esModule: true,
  exchangeCodeForUserInfo: jest.fn(),
  buildAuthorizationUrl: jest.fn(async () => "https://idp.example/authorize"),
  generateState: jest.fn(() => "test-state"),
  generateNonce: jest.fn(() => "test-nonce"),
  getOidcClient: jest.fn(),
}));

import app from "../../src/app";
import { prisma } from "../../src/shared/db/prisma";
import { exchangeCodeForUserInfo } from "../../src/shared/auth/oidcClient";
import { clearTables } from "../helpers/db";

const mockExchange = exchangeCodeForUserInfo as jest.Mock;

const future = () => new Date(Date.now() + 10 * 60 * 1000);

const createState = (state: string, inviteToken: string | null = null) =>
  prisma.oidcState.create({ data: { state, nonce: "nonce", inviteToken, expiresAt: future() } });

const callback = (state: string) =>
  request(app).get("/api/auth/sso/callback").query({ state, code: "auth-code" });

const createAdmin = () =>
  prisma.user.create({
    data: {
      email: "admin@test.com",
      role: "SUPER_ADMIN",
      firstName: "Admin",
      lastName: "User",
      password: "hashed",
      publicBookingSlug: `admin-${Date.now()}`,
    },
  });

// These tests lock in the SSO security posture: SSO never silently links to an
// existing account, and never provisions a SUPER_ADMIN.
describe("SSO callback security", () => {
  beforeEach(clearTables);
  afterAll(clearTables);

  it("does not link an SSO identity to an existing password account (no auto-link)", async () => {
    const user = await prisma.user.create({
      data: {
        email: "victim@test.com",
        password: "hashed",
        role: "COACH",
        firstName: "Victim",
        lastName: "User",
        publicBookingSlug: "victim-coach",
      },
    });
    await createState("s-login");
    // Attacker's IdP asserts the victim's email under a sub we've never seen.
    mockExchange.mockResolvedValue({ email: "victim@test.com", sub: "attacker-sub" });

    const res = await callback("s-login");

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("/sso/error");
    expect(res.headers.location).toContain("no_account");
    expect(res.headers["set-cookie"]).toBeUndefined();

    // The existing account remains unlinked.
    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after?.ssoSub).toBeNull();
    expect(after?.ssoProvider).toBeNull();
  });

  it("rejects invite acceptance when the SSO email does not match the invite", async () => {
    const admin = await createAdmin();
    await prisma.userInvite.create({
      data: {
        email: "invitee@test.com",
        role: "COACH",
        token: "tok-mismatch",
        expiresAt: future(),
        requiresSso: true,
        createdBy: admin.id,
      },
    });
    await createState("s-mismatch", "tok-mismatch");
    mockExchange.mockResolvedValue({ email: "someone-else@test.com", sub: "sub-1" });

    const res = await callback("s-mismatch");

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("email_mismatch");
    expect(await prisma.user.findUnique({ where: { email: "someone-else@test.com" } })).toBeNull();
  });

  it("never provisions a SUPER_ADMIN via SSO", async () => {
    const admin = await createAdmin();
    await prisma.userInvite.create({
      data: {
        email: "wannabe@test.com",
        role: "SUPER_ADMIN",
        token: "tok-super",
        expiresAt: future(),
        requiresSso: true,
        createdBy: admin.id,
      },
    });
    await createState("s-super", "tok-super");
    mockExchange.mockResolvedValue({ email: "wannabe@test.com", sub: "sub-2" });

    const res = await callback("s-super");

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("forbidden");
    expect(await prisma.user.findUnique({ where: { email: "wannabe@test.com" } })).toBeNull();
  });

  it("rejects invite acceptance when a user with that email already exists", async () => {
    const admin = await createAdmin();
    await prisma.user.create({
      data: {
        email: "dup@test.com",
        role: "COACH",
        firstName: "Dup",
        lastName: "User",
        password: "hashed",
        publicBookingSlug: "dup-coach",
      },
    });
    await prisma.userInvite.create({
      data: {
        email: "dup@test.com",
        role: "COACH",
        token: "tok-dup",
        expiresAt: future(),
        requiresSso: true,
        createdBy: admin.id,
      },
    });
    await createState("s-dup", "tok-dup");
    mockExchange.mockResolvedValue({ email: "dup@test.com", sub: "sub-3" });

    const res = await callback("s-dup");

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("user_already_exists");
  });

  it("redirects to an error when the state is unknown (no provider call)", async () => {
    const res = await callback("does-not-exist");

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("invalid_state");
    expect(mockExchange).not.toHaveBeenCalled();
  });
});
