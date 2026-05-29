import { UserRole } from "@prisma/client";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../error/errorhandler";
import { prisma } from "../db/prisma";
import { canReadUser } from "../auth/permissions";
import { getJwtSecret } from "../utils/jwtUtils";
import { getRequestLogger } from "../logging/requestContext";

const AUTH_COOKIE_NAME = "auth_token";

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
        getRequestLogger().warn("Authenticated user no longer exists in database.", {
          userId: parsed.id,
        });
        next(new ErrorHandler(StatusCodes.UNAUTHORIZED, "Invalid or expired authentication token."));
        return;
      }

      if (!user.isActive) {
        // Account was deactivated while the session was still live — security event.
        getRequestLogger().warn("Access rejected: account deactivated mid-session.", {
          userId: user.id,
          role: user.role,
        });
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

// Like authenticate, but does not block if no token is present or the token is invalid.
// Sets res.locals.authUser only when a valid, active session exists.
// Used on routes that accept both session auth and alternative auth (e.g. reschedule tokens).
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
