import { UserRole } from "@prisma/client";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../error/errorhandler";
import { prisma } from "../db/prisma";
import { canReadUser } from "../auth/permissions";
import { getJwtSecret } from "../auth/jwtUtils";
import { getRequestLogger } from "../logging/requestContext";

const AUTH_COOKIE_NAME = "auth_token";

/**
 * Minimal user fields attached to `res.locals.authUser` after successful
 * authentication. The role is always sourced from the database, never from
 * the JWT claim, so it reflects the current state of the account.
 */
type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
};

const getTokenFromRequest = (req: Request): string | undefined => {
  const reqWithCookies = req as Request & {
    cookies?: Record<string, unknown>;
  };

  const tokenFromCookie = reqWithCookies.cookies?.[AUTH_COOKIE_NAME];

  if (typeof tokenFromCookie === "string" && tokenFromCookie.length > 0) {
    return tokenFromCookie;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return undefined;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  return token.length > 0 ? token : undefined;
};

const parseJwtPayload = (payload: string | JwtPayload): AuthUser => {
  if (typeof payload === "string") {
    throw new ErrorHandler(StatusCodes.UNAUTHORIZED, "Invalid authentication token payload.");
  }

  const role = payload.role;

  if (
    typeof payload.sub !== "string" ||
    typeof payload.email !== "string" ||
    typeof role !== "string" ||
    !Object.values(UserRole).includes(role as UserRole)
  ) {
    throw new ErrorHandler(StatusCodes.UNAUTHORIZED, "Invalid authentication token payload.");
  }

  return {
    id: payload.sub,
    email: payload.email,
    role: role as UserRole,
  };
};

/**
 * Express middleware that verifies the session JWT and sets `res.locals.authUser`.
 *
 * The user record is re-fetched from the database on every request so that
 * account deactivations and role changes take effect immediately, without
 * waiting for the token to expire.
 *
 * Accepts the token from either the `auth_token` cookie (browser sessions) or
 * the `Authorization: Bearer <token>` header (API clients / public reschedule flow).
 *
 * @throws {ErrorHandler} 401 — no token present, token fails verification,
 *   user no longer exists in the database, or the account has been deactivated.
 */
const authenticate = (req: Request, res: Response, next: NextFunction): Promise<void> => {
  return (async () => {
    const token = getTokenFromRequest(req);

    if (!token) {
      next(new ErrorHandler(StatusCodes.UNAUTHORIZED, "Authentication token is required."));
      return;
    }

    try {
      const payload = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
      const parsed = parseJwtPayload(payload);

      // Re-check the user in DB on every request so that deactivated accounts
      // lose access immediately (no waiting for JWT expiry).
      const user = await prisma.user.findUnique({
        where: { id: parsed.id },
        select: { id: true, email: true, role: true, isActive: true },
      });

      if (!user) {
        // User was deleted from DB after token was issued — rare but possible.
        getRequestLogger().warn({ userId: parsed.id }, "Authenticated user no longer exists in database.");
        next(new ErrorHandler(StatusCodes.UNAUTHORIZED, "Invalid or expired authentication token."));
        return;
      }

      if (!user.isActive) {
        // Account was deactivated while the session was still live — security event.
        getRequestLogger().warn({ userId: user.id, role: user.role }, "Access rejected: account deactivated mid-session.");
        next(new ErrorHandler(StatusCodes.UNAUTHORIZED, "Invalid or expired authentication token."));
        return;
      }

      // Always use the DB role — so role changes take effect immediately too.
      res.locals.authUser = { id: user.id, email: user.email, role: user.role };
      next();
    } catch {
      // JWT is present but fails verification — could be tampered, malformed, or expired.
      getRequestLogger().warn("JWT verification failed — token present but invalid.");
      next(new ErrorHandler(StatusCodes.UNAUTHORIZED, "Invalid or expired authentication token."));
    }
  })();
};

/**
 * Like `authenticate`, but non-blocking: sets `res.locals.authUser` only when
 * a valid, active session token is present and silently continues otherwise.
 *
 * Use on routes that accept both JWT session auth and an alternative auth
 * mechanism (e.g. single-use reschedule tokens). Controllers on these routes
 * must check `res.locals.authUser` themselves and fall back to their alternative
 * auth path when it is absent.
 */
const optionalAuthenticate = (req: Request, res: Response, next: NextFunction): Promise<void> => {
  return (async () => {
    const token = getTokenFromRequest(req);
    if (!token) {
      next();
      return;
    }
    try {
      const payload = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
      const parsed = parseJwtPayload(payload);
      const user = await prisma.user.findUnique({
        where: { id: parsed.id },
        select: { id: true, email: true, role: true, isActive: true },
      });
      if (user?.isActive) {
        res.locals.authUser = { id: user.id, email: user.email, role: user.role };
      }
    } catch {
      // Token present but invalid — continue without blocking
    }
    next();
  })();
};

/**
 * Factory that returns a middleware enforcing role-based access control.
 * Must be applied after `authenticate` (which sets `res.locals.authUser`).
 *
 * @param allowedRoles - One or more roles permitted to access the route.
 * @throws {ErrorHandler} 401 if `authUser` is absent, 403 if the caller's
 *   role is not in `allowedRoles`.
 */
const authorize = (...allowedRoles: UserRole[]) => {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const authUser = res.locals.authUser as AuthUser | undefined;

    if (!authUser) {
      next(new ErrorHandler(StatusCodes.UNAUTHORIZED, "Authentication is required."));
      return;
    }

    if (!allowedRoles.includes(authUser.role)) {
      next(
        new ErrorHandler(
          StatusCodes.FORBIDDEN,
          "You do not have permission to perform this action.",
        ),
      );
      return;
    }

    next();
  };
};

/**
 * Middleware that allows a user to read their own profile or delegates the
 * decision to `canReadUser` for elevated roles (SUPER_ADMIN, TEAM_ADMIN).
 * Reads the target user ID from `req.params.userId`.
 *
 * @throws {ErrorHandler} 401 if unauthenticated, 403 if the caller lacks
 *   read permission for the target user.
 */
const authorizeUserRead = (req: Request, res: Response, next: NextFunction): void => {
  const authUser = res.locals.authUser as AuthUser | undefined;

  if (!authUser) {
    next(new ErrorHandler(StatusCodes.UNAUTHORIZED, "Authentication is required."));
    return;
  }

  const targetUserId = String(req.params.userId ?? "");
  if (canReadUser(authUser, targetUserId)) {
    next();
    return;
  }

  next(
    new ErrorHandler(StatusCodes.FORBIDDEN, "You do not have permission to perform this action."),
  );
};

export { authenticate, optionalAuthenticate, authorize, authorizeUserRead, type AuthUser };
