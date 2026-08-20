import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../db/prisma";
import { getRequestLogger } from "../logging/requestContext";

const REFRESH_TOKEN_BYTES = 32;

/**
 * Window during which a *just-rotated* token is still accepted instead of being
 * treated as theft. Two browser tabs can hit `/auth/refresh` near-simultaneously
 * with the same cookie; the loser of that race would otherwise look identical to
 * an attacker replaying a stolen token. Kept short — inside this window a replayed
 * token is honoured, which is the standard rotation/usability tradeoff.
 */
const getGraceWindowMs = (): number => {
  const raw = Number(process.env.REFRESH_TOKEN_GRACE_WINDOW_MS ?? "15000");
  return Number.isFinite(raw) && raw >= 0 ? raw : 15000;
};

export const getRefreshTokenTtlSeconds = (): number => {
  const raw = Number(process.env.REFRESH_TOKEN_EXPIRES_IN_SECONDS ?? "2592000");
  return Number.isFinite(raw) && raw > 0 ? raw : 2592000;
};

/**
 * Refresh tokens are high-entropy random strings, not passwords — a single
 * SHA-256 is sufficient (and fast). Storing only the hash means a leaked
 * database dump yields no usable session credentials.
 */
const hashToken = (rawToken: string): string =>
  createHash("sha256").update(rawToken).digest("hex");

export type RefreshTokenMeta = {
  userAgent?: string | null;
  ipAddress?: string | null;
};

export type RotateResult =
  | { status: "success"; userId: string; token: string }
  | { status: "invalid" }
  | { status: "reused" };

/**
 * Mints a refresh token for `userId` and persists only its hash.
 *
 * @returns The raw token — returned once and never recoverable from the row.
 */
export const issueRefreshToken = async (
  userId: string,
  meta: RefreshTokenMeta = {},
): Promise<string> => {
  const rawToken = randomBytes(REFRESH_TOKEN_BYTES).toString("hex");

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + getRefreshTokenTtlSeconds() * 1000),
      userAgent: meta.userAgent ?? null,
      ipAddress: meta.ipAddress ?? null,
    },
  });

  return rawToken;
};

/**
 * Consumes a refresh token and issues its replacement (rotation-on-use).
 *
 * Presenting a token that was already rotated away is treated as a theft signal
 * and revokes every active token for that user — except inside the grace window,
 * which absorbs benign multi-tab races (see `getGraceWindowMs`).
 */
export const rotateRefreshToken = async (
  rawToken: string,
  meta: RefreshTokenMeta = {},
): Promise<RotateResult> => {
  const tokenHash = hashToken(rawToken);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.refreshToken.findUnique({ where: { tokenHash } });

    if (!existing || existing.expiresAt <= new Date()) {
      return { status: "invalid" };
    }

    const now = new Date();

    // Compare-and-set: only one concurrent caller can flip revokedAt from null,
    // so a lost race is indistinguishable from a replay and falls through below.
    const claimed = await tx.refreshToken.updateMany({
      where: { id: existing.id, revokedAt: null },
      data: { revokedAt: now },
    });

    if (claimed.count === 0) {
      // Re-read: losing the compare-and-set means the winner has now committed,
      // so `existing` is stale with respect to revokedAt/replacedByTokenId.
      const current = await tx.refreshToken.findUnique({ where: { id: existing.id } });

      // Revoked without a replacement means logout (or an earlier theft response)
      // deliberately ended this session — final, but not a theft signal in itself,
      // so the user's other sessions are left alone.
      if (current?.replacedByTokenId == null) {
        return { status: "invalid" };
      }

      const revokedAt = current.revokedAt ?? now;
      const isWithinGraceWindow = now.getTime() - revokedAt.getTime() <= getGraceWindowMs();

      if (!isWithinGraceWindow) {
        await tx.refreshToken.updateMany({
          where: { userId: existing.userId, revokedAt: null },
          data: { revokedAt: now },
        });

        getRequestLogger().warn(
          { userId: existing.userId, tokenId: existing.id },
          "Refresh token reuse detected — all sessions for this user revoked.",
        );

        return { status: "reused" };
      }
    }

    const replacementRaw = randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
    const replacement = await tx.refreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: hashToken(replacementRaw),
        expiresAt: new Date(Date.now() + getRefreshTokenTtlSeconds() * 1000),
        userAgent: meta.userAgent ?? null,
        ipAddress: meta.ipAddress ?? null,
      },
    });

    // Only the winner of the compare-and-set owns the chain link; the grace-window
    // path leaves the original row's replacedByTokenId (already set) untouched.
    if (claimed.count === 1) {
      await tx.refreshToken.update({
        where: { id: existing.id },
        data: { replacedByTokenId: replacement.id },
      });
    }

    return { status: "success", userId: existing.userId, token: replacementRaw };
  });
};

/** Best-effort single-session revocation used by logout. Never throws. */
export const revokeRefreshToken = async (rawToken: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

export const revokeAllRefreshTokensForUser = async (userId: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

/**
 * Deletes expired rows so rotation does not grow the table without bound.
 *
 * Runs on a schedule (see `refreshTokenCleanup.worker.ts`), not per-request: an
 * earlier version ran opportunistically inside every `refresh` call, which meant
 * a table-wide `deleteMany` fired on every session's ~15-minute renewal — many
 * overlapping full-predicate deletes racing on the same expired rows under normal
 * traffic, with cost scaling with active-session count instead of being flat.
 *
 * @returns The number of rows deleted, for the caller to log.
 */
export const purgeExpiredRefreshTokens = async (): Promise<number> => {
  const { count } = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
};
