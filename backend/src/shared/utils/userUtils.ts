import { StatusCodes } from "http-status-codes";
import { Prisma, type User, UserRole } from "@prisma/client";
import { ErrorHandler } from "../error/errorhandler";

export const SALT_ROUNDS = 10;

export type SafeUser = Omit<User, "password" | "ssoSub" | "ssoProvider">;

export type CallerContext = {
  id: string;
  role: UserRole;
};

export const safeUserSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  publicBookingSlug: true,
  firstName: true,
  lastName: true,
  email: true,
  phoneNumber: true,
  country: true,
  preferredLanguage: true,
  avatarUrl: true,
  role: true,
  timezone: true,
  zoomIsvLink: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  ssoLinkedAt: true,
  // failedLoginAttempts, lockedUntil, ssoProvider and ssoSub are internal — never sent to clients
});

// Use this select only on admin-facing user management endpoints (SUPER_ADMIN / TEAM_ADMIN).
export const adminUserSelect = Prisma.validator<Prisma.UserSelect>()({
  ...safeUserSelect,
  failedLoginAttempts: true,
  lockedUntil: true,
});

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const validateTimezone = (timezone: string): string => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return timezone;
  } catch {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      'Invalid timezone. Use an IANA timezone like "America/New_York".',
    );
  }
};

export const validateZoomIsvLink = (zoomIsvLink: string): string => {
  try {
    const url = new URL(zoomIsvLink);

    if (url.protocol !== "https:") {
      throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Zoom ISV link must use https.");
    }

    return url.toString();
  } catch (error) {
    if (error instanceof ErrorHandler) {
      throw error;
    }

    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "Invalid Zoom ISV link. Provide a full https meeting URL.",
    );
  }
};

export const toSafeUser = (user: User): SafeUser => {
  const { password: _password, ssoSub: _ssoSub, ssoProvider: _ssoProvider, ...safeUser } = user;
  return safeUser;
};
