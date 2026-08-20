import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../error/errorhandler";
import {
  AUTH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  REFRESH_COOKIE_NAME,
} from "../auth/cookie";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const csrfProtectionEnabled = process.env.ENABLE_CSRF_PROTECTION !== "false";

// Independent kill-switch for the refresh-cookie clause below, so it can be rolled
// back on its own rather than disabling CSRF for the entire API.
const refreshCookieCsrfEnabled = process.env.ENABLE_REFRESH_COOKIE_CSRF !== "false";

// Pre-auth routes create a new session — there is no existing session to protect,
// so CSRF validation is unconditionally skipped regardless of stale cookies.
//
// `/api/auth/logout` is exempt for a different reason: ending a session must never
// be blocked. Requiring a CSRF token here means any client that cannot produce one
// — cleared localStorage, an SSO redirect that returned no body, a stale tab — can
// never log out, leaving a live session behind on a possibly shared machine. That
// is a worse outcome than the attack the check prevents: a cross-site forced logout
// is a nuisance, not a compromise, since the attacker gains nothing and destroys
// only the victim's own session. Under the default `SameSite=lax` a cross-site POST
// carries no cookies at all, so this only widens exposure in `SameSite=none`
// deployments, and only to that nuisance.
//
// `/api/auth/refresh` is deliberately NOT exempt: it mints fresh credentials and
// rotates the stored token, so it keeps the same protection as any other write.
const AUTH_EXEMPT_PREFIXES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/bootstrap",
  "/api/auth/sso",
  "/api/auth/logout",
  "/api/invites/accept-invite",
];

const isAuthExempt = (path: string): boolean =>
  AUTH_EXEMPT_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + "/"));

const matchesToken = (cookieToken: string, headerToken: string): boolean => {
  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  if (cookieBuffer.length !== headerBuffer.length) {
    return false;
  }

  return timingSafeEqual(cookieBuffer, headerBuffer);
};

export const csrfProtection = (req: Request, _res: Response, next: NextFunction): void => {
  if (!csrfProtectionEnabled || SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  if (isAuthExempt(req.path)) {
    next();
    return;
  }

  // Skip only when the request carries no cookie-borne credential at all — i.e. a
  // pure Bearer client, which has no ambient authority for a cross-site page to abuse.
  //
  // The refresh cookie counts as such a credential. Without it in this check, an idle
  // user whose short-lived `auth_token` has already expired would bypass CSRF on
  // `/auth/refresh` and `/auth/logout` — and under the cross-origin `SameSite=none`
  // production config, any site could then force a rotation or a logout.
  //
  // Deliberately a credential check rather than a path allowlist: Express routing is
  // case-insensitive and non-strict, so `/api/auth/REFRESH` would slip past a path
  // list and fail *open*. This formulation has no such gap.
  const authCookie = req.cookies?.[AUTH_COOKIE_NAME];
  const refreshCookie = refreshCookieCsrfEnabled ? req.cookies?.[REFRESH_COOKIE_NAME] : undefined;
  const hasCookieCredential =
    (typeof authCookie === "string" && authCookie.length > 0) ||
    (typeof refreshCookie === "string" && refreshCookie.length > 0);

  if (!hasCookieCredential) {
    next();
    return;
  }

  const csrfCookie = req.cookies?.[CSRF_COOKIE_NAME];
  const csrfHeader = req.get(CSRF_HEADER_NAME) ?? req.get("x-xsrf-token");

  if (
    typeof csrfCookie !== "string" ||
    csrfCookie.length === 0 ||
    typeof csrfHeader !== "string" ||
    csrfHeader.length === 0 ||
    !matchesToken(csrfCookie, csrfHeader)
  ) {
    next(new ErrorHandler(StatusCodes.FORBIDDEN, "Invalid CSRF token."));
    return;
  }

  next();
};
