import { randomUUID } from "node:crypto";
import type { Response } from "express";
import { getAccessTokenTtlSeconds } from "./jwtUtils";
import { getRefreshTokenTtlSeconds } from "./refreshTokenUtils";

export const AUTH_COOKIE_NAME = "auth_token";
export const REFRESH_COOKIE_NAME = "refresh_token";
export const CSRF_COOKIE_NAME = "csrf_token";
export const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * The refresh cookie is scoped to `/api/auth` so the browser only ever transmits
 * this long-lived credential to the two endpoints that need it (`/refresh` and
 * `/logout`) — every other API call carries the short-lived access token alone.
 */
const REFRESH_COOKIE_PATH = "/api/auth";

const getCookieSameSite = (): "lax" | "strict" | "none" => {
  const sameSite = process.env.COOKIE_SAME_SITE?.toLowerCase();
  if (sameSite === "none" || sameSite === "strict" || sameSite === "lax") {
    return sameSite as "lax" | "strict" | "none";
  }
  // Default to 'none' in production to support cross-site requests (e.g. onrender.com subdomains)
  return process.env.NODE_ENV === "production" ? "none" : "lax";
};

const buildCookieOptions = (httpOnly: boolean) => {
  const sameSite = getCookieSameSite();
  return {
    httpOnly,
    sameSite,
    secure: process.env.NODE_ENV === "production" || sameSite === "none",
  } as const;
};

/**
 * Only a value we could have minted ourselves is safe to echo back: the caller
 * passes a client-supplied cookie, and an unvalidated one could be fixated by a
 * cookie-tossing attacker or contain characters that make cookie serialization throw.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isMintableCsrfToken = (token: unknown): token is string =>
  typeof token === "string" && UUID_PATTERN.test(token);

export const setCsrfCookie = (res: Response, token: string = randomUUID()): string => {
  // Scoped to the refresh lifetime, not the access lifetime: the CSRF cookie must
  // outlive the short-lived access token, or an idle user's stored header value
  // would outlast its cookie counterpart and fail the double-submit comparison.
  const maxAgeMs = getRefreshTokenTtlSeconds() * 1000;
  res.cookie(CSRF_COOKIE_NAME, token, {
    ...buildCookieOptions(false),
    maxAge: maxAgeMs,
  });
  return token;
};

export const clearCsrfCookie = (res: Response): void => {
  res.clearCookie(CSRF_COOKIE_NAME, buildCookieOptions(false));
};

/**
 * @param existingCsrfToken - When supplied and well-formed, the CSRF token is kept
 *   rather than rotated. Refresh passes the incoming cookie so the token changes only
 *   at session start: rotating it every 15 minutes strands other tabs, which hold
 *   their own in-memory copy and would fail the double-submit check on their next write.
 */
export const setAuthCookie = (
  res: Response,
  token: string,
  existingCsrfToken?: string,
): string => {
  const maxAgeMs = getAccessTokenTtlSeconds() * 1000;
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...buildCookieOptions(true),
    maxAge: maxAgeMs,
  });

  return isMintableCsrfToken(existingCsrfToken)
    ? setCsrfCookie(res, existingCsrfToken)
    : setCsrfCookie(res);
};

export const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...buildCookieOptions(true),
    path: REFRESH_COOKIE_PATH,
    maxAge: getRefreshTokenTtlSeconds() * 1000,
  });
};

export const clearRefreshCookie = (res: Response): void => {
  // `path` must match the one used when setting, or the browser keeps the cookie.
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...buildCookieOptions(true),
    path: REFRESH_COOKIE_PATH,
  });
};

/**
 * Drops the session credentials but leaves the CSRF cookie in place.
 *
 * Used when a refresh is rejected: the dead refresh cookie would otherwise be
 * re-sent on every future request for its full 30-day life. The CSRF cookie is
 * deliberately spared — clearing it strands the frontend's stored copy in the very
 * mismatch state that makes writes fail with no recovery path.
 */
export const clearSessionCookies = (res: Response): void => {
  res.clearCookie(AUTH_COOKIE_NAME, buildCookieOptions(true));
  clearRefreshCookie(res);
};

export const clearAuthCookie = (res: Response): void => {
  clearSessionCookies(res);
  clearCsrfCookie(res);
};
