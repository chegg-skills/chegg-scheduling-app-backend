import { StatusCodes } from "http-status-codes";
import { Prisma, type User, UserRole } from "@prisma/client";
import { ErrorHandler } from "../error/errorhandler";

export const SALT_ROUNDS = 10;

export type SafeUser = Omit<User, "password">;

export type CallerContext = {
  id: string;
  role: UserRole;
};

export const safeUserSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phoneNumber: true,
  avatarUrl: true,
  role: true,
  timezone: true,
  isActive: true,
  failedLoginAttempts: true,
  lockedUntil: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
});

export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

export const validateTimezone = (timezone: string): string => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return timezone;
  } catch {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      'Invalid timezone. Use an IANA timezone like "America/New_York".'
    );
  }
};

export const toSafeUser = (user: User): SafeUser => {
  const { password: _password, ...safeUser } = user;
  return safeUser;
};
