import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/shared/db/prisma";
import { purgeExpiredRefreshTokens } from "../../src/shared/auth/refreshTokenUtils";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin } from "../helpers/auth";

beforeEach(clearTables);
afterAll(clearTables);

describe("purgeExpiredRefreshTokens", () => {
  it("deletes only expired rows and returns the count", async () => {
    const admin = await bootstrapAdmin("cleanup@test.com", "Admin1234");

    const expired = await prisma.refreshToken.create({
      data: {
        userId: admin.id,
        tokenHash: "expired-hash",
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    const active = await prisma.refreshToken.create({
      data: {
        userId: admin.id,
        tokenHash: "active-hash",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const count = await purgeExpiredRefreshTokens();
    expect(count).toBe(1);

    // bootstrapAdmin's own login issues a third (active) row for the same user,
    // so assert on presence/absence rather than the exact set.
    const remainingIds = (
      await prisma.refreshToken.findMany({ where: { userId: admin.id } })
    ).map((r) => r.id);
    expect(remainingIds).toContain(active.id);
    expect(remainingIds).not.toContain(expired.id);
  });

  it("is a no-op when nothing is expired", async () => {
    const admin = await bootstrapAdmin("cleanup2@test.com", "Admin1234");
    await prisma.refreshToken.create({
      data: {
        userId: admin.id,
        tokenHash: "still-active",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const count = await purgeExpiredRefreshTokens();
    expect(count).toBe(0);
  });
});

// Regression guard for the fix: cleanup used to run inside every successful
// `refresh` call (a table-wide deleteMany per session renewal). It must not fire
// as a side effect of refresh any more — only on the worker's own schedule.
describe("refresh does not trigger cleanup as a side effect", () => {
  it("leaves an expired row from another session untouched after a refresh", async () => {
    const admin = await bootstrapAdmin("cleanup3@test.com", "Admin1234");

    const staleFromAnotherSession = await prisma.refreshToken.create({
      data: {
        userId: admin.id,
        tokenHash: "stale-other-session",
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "cleanup3@test.com", password: "Admin1234" });
    const refreshCookie = (login.headers["set-cookie"] as unknown as string[])
      .find((c) => c.startsWith("refresh_token="))
      ?.split(";")[0]
      .split("=")[1] as string;
    const csrfCookie = (login.headers["set-cookie"] as unknown as string[])
      .find((c) => c.startsWith("csrf_token="))
      ?.split(";")[0]
      .split("=")[1] as string;

    await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", [`refresh_token=${refreshCookie}`, `csrf_token=${csrfCookie}`])
      .set("x-csrf-token", csrfCookie);

    const stillThere = await prisma.refreshToken.findUnique({
      where: { id: staleFromAnotherSession.id },
    });
    expect(stillThere).not.toBeNull();
  });
});
