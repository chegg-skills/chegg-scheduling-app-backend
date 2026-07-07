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
 * Signs a JWT for the given user. Expiry is controlled by the
 * `JWT_EXPIRES_IN_SECONDS` environment variable (default: 86400 — 24 hours).
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
  const raw = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? "86400");
  const expiresInSeconds = Number.isFinite(raw) && raw > 0 ? raw : 86400;
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, getJwtSecret(), {
    expiresIn: expiresInSeconds,
  });
};
