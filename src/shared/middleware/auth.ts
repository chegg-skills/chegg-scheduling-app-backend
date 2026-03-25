import { UserRole } from "@prisma/client";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../error/errorhandler";
import { prisma } from "../db/prisma";
import { getJwtSecret } from "../utils/jwtUtils";

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
    throw new ErrorHandler(
      StatusCodes.UNAUTHORIZED,
      "Invalid authentication token payload."
    );
  }

  const role = payload.role;

  if (
    typeof payload.sub !== "string" ||
    typeof payload.email !== "string" ||
    typeof role !== "string" ||
    !Object.values(UserRole).includes(role as UserRole)
  ) {
    throw new ErrorHandler(
      StatusCodes.UNAUTHORIZED,
      "Invalid authentication token payload."
    );
  }

  return {
    id: payload.sub,
    email: payload.email,
    role: role as UserRole,
  };
};

const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  return (async () => {
    const token = getTokenFromRequest(req);

    if (!token) {
      next(
        new ErrorHandler(
          StatusCodes.UNAUTHORIZED,
          "Authentication token is required."
        )
      );
      return;
    }

    try {
      const payload = jwt.verify(token, getJwtSecret());
      const parsed = parseJwtPayload(payload);

      // Re-check the user in DB on every request so that deactivated accounts
      // lose access immediately (no waiting for JWT expiry).
      const user = await prisma.user.findUnique({
        where: { id: parsed.id },
        select: { id: true, email: true, role: true, isActive: true },
      });

      if (!user || !user.isActive) {
        next(
          new ErrorHandler(
            StatusCodes.UNAUTHORIZED,
            "Invalid or expired authentication token."
          )
        );
        return;
      }

      // Always use the DB role — so role changes take effect immediately too.
      res.locals.authUser = { id: user.id, email: user.email, role: user.role };
      next();
    } catch {
      next(
        new ErrorHandler(
          StatusCodes.UNAUTHORIZED,
          "Invalid or expired authentication token."
        )
      );
    }
  })();
};

const authorize = (...allowedRoles: UserRole[]) => {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const authUser = res.locals.authUser as AuthUser | undefined;

    if (!authUser) {
      next(
        new ErrorHandler(
          StatusCodes.UNAUTHORIZED,
          "Authentication is required."
        )
      );
      return;
    }

    if (!allowedRoles.includes(authUser.role)) {
      next(
        new ErrorHandler(
          StatusCodes.FORBIDDEN,
          "You do not have permission to perform this action."
        )
      );
      return;
    }

    next();
  };
};

export { authenticate, authorize, type AuthUser };
