import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../error/errorhandler";
import { logger } from "../logging/logger";
import type { SafeUser } from "../utils/userUtils";

/**
 * Returns the `JWT_SECRET` environment variable, throwing a 500 if it is
 * absent. Centralised here so misconfiguration is caught at call-time with a
 * clear error rather than silently producing an empty signature.
 *
 * @throws {ErrorHandler} 500 — `JWT_SECRET` is not set.
 */
export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    logger.error("JWT_SECRET environment variable is missing.");
    throw new ErrorHandler(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Infrastructure error: Authentication is not configured correctly.",
    );
  }
  return secret;
};

/**
 * Lifetime of the short-lived access token, in seconds (default: 900 — 15 min).
 * Renewal is the refresh token's job, so this stays short by design.
 */
export const getAccessTokenTtlSeconds = (): number => {
  const raw = Number(process.env.ACCESS_TOKEN_EXPIRES_IN_SECONDS ?? "900");
  return Number.isFinite(raw) && raw > 0 ? raw : 900;
};

/**
 * Signs a short-lived access JWT for the given user. Expiry comes from
 * {@link getAccessTokenTtlSeconds}; renewal is handled by the refresh-token
 * flow (`POST /api/auth/refresh`), not by lengthening this token.
 *
 * The token embeds `sub` (user id), `role`, and `email`. The `authenticate`
 * middleware re-queries the database on every request, so the role embedded
 * here is only used as a fallback in case of a DB outage and is never trusted
 * for authorization decisions.
 *
 * @param user - The authenticated user whose identity to encode.
 * @returns A signed HS256 JWT string.
 */
export const buildAuthToken = (user: SafeUser): string => {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, getJwtSecret(), {
    expiresIn: getAccessTokenTtlSeconds(),
  });
};
