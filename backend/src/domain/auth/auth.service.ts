import { UserRole } from "@prisma/client";
import bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { rethrowPrismaError } from "../../shared/error/prismaError";
import { logger } from "../../shared/logging/logger";
import { buildAuthToken } from "../../shared/utils/jwtUtils";
import { createPublicBookingSlug } from "../../shared/utils/publicBookingSlug";
import {
  SALT_ROUNDS,
  type SafeUser,
  normalizeEmail,
  validateTimezone,
  toSafeUser,
} from "../../shared/utils/userUtils";
import { LoginSchema, RegisterSchema } from "./auth.schema";

const MAX_FAILED_LOGIN_ATTEMPTS = Number(process.env.MAX_FAILED_LOGIN_ATTEMPTS ?? 5);
const LOGIN_LOCKOUT_MINUTES = Number(process.env.LOGIN_LOCKOUT_MINUTES ?? 15);

const getLockoutUntil = (): Date => {
  return new Date(Date.now() + LOGIN_LOCKOUT_MINUTES * 60 * 1000);
};

type RegisterUserInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  avatarUrl?: string;
  role?: string;
  timezone?: string;
};

type LoginUserInput = {
  email: string;
  password: string;
};

const register = async (payload: RegisterUserInput): Promise<{ user: SafeUser; token: string }> => {
  const validated = await RegisterSchema.body.parseAsync(payload);

  const normalizedEmail = normalizeEmail(validated.email);

  const timezone = validated.timezone ? validateTimezone(validated.timezone) : "UTC";

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new ErrorHandler(StatusCodes.CONFLICT, "A user with this email already exists.");
  }

  const hashedPassword = await bcrypt.hash(validated.password, SALT_ROUNDS);

  try {
    const createdUser = await prisma.user.create({
      data: {
        firstName: validated.firstName,
        lastName: validated.lastName,
        email: normalizedEmail,
        publicBookingSlug: createPublicBookingSlug(
          `${validated.firstName} ${validated.lastName}`,
          "coach",
        ),
        password: hashedPassword,
        phoneNumber: validated.phoneNumber,
        avatarUrl: validated.avatarUrl,
        role: validated.role || UserRole.COACH,
        timezone,
      },
    });

    const safeUser = toSafeUser(createdUser);

    logger.info("User registered successfully.", {
      userId: safeUser.id,
      role: safeUser.role,
    });

    return {
      user: safeUser,
      token: buildAuthToken(safeUser),
    };
  } catch (error) {
    return rethrowPrismaError(error, {
      P2002: {
        status: StatusCodes.CONFLICT,
        message: "A user with this email already exists.",
      },
    });
  }
};

const login = async (payload: LoginUserInput): Promise<{ user: SafeUser; token: string }> => {
  const validated = await LoginSchema.body.parseAsync(payload);
  const normalizedEmail = normalizeEmail(validated.email);
  const password = validated.password;

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new ErrorHandler(StatusCodes.UNAUTHORIZED, "Invalid email or password.");
  }

  if (!user.isActive) {
    logger.warn("Inactive account login attempt blocked.", {
      userId: user.id,
      role: user.role,
    });
    throw new ErrorHandler(
      StatusCodes.FORBIDDEN,
      "This account is inactive. Please contact an administrator.",
    );
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    logger.warn("Locked account login attempt blocked.", {
      userId: user.id,
      lockedUntil: user.lockedUntil.toISOString(),
    });
    throw new ErrorHandler(
      StatusCodes.LOCKED,
      "Too many failed attempts. Account is temporarily locked.",
    );
  }

  if (!user.password) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "This account uses SSO. Please sign in with your identity provider.",
    );
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    const nextFailedAttempts = user.failedLoginAttempts + 1;
    const shouldLockAccount = nextFailedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS;
    const lockedUntil = shouldLockAccount ? getLockoutUntil() : null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: shouldLockAccount ? 0 : nextFailedAttempts,
        lockedUntil,
      },
    });

    if (shouldLockAccount) {
      logger.warn("User account locked after repeated failed login attempts.", {
        userId: user.id,
        attempts: nextFailedAttempts,
        lockedUntil: lockedUntil?.toISOString(),
      });
      throw new ErrorHandler(
        StatusCodes.LOCKED,
        "Too many failed attempts. Account is temporarily locked.",
      );
    }

    logger.warn("Invalid password attempt recorded.", {
      userId: user.id,
      failedLoginAttempts: nextFailedAttempts,
    });

    throw new ErrorHandler(StatusCodes.UNAUTHORIZED, "Invalid email or password.");
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  const safeUser = toSafeUser(updatedUser);

  logger.info("User logged in successfully.", {
    userId: safeUser.id,
    role: safeUser.role,
  });

  return {
    user: safeUser,
    token: buildAuthToken(safeUser),
  };
};

const logout = async (): Promise<{ message: string }> => {
  return { message: "Logged out successfully." };
};

type BootstrapInput = {
  bootstrapSecret: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  timezone?: string;
};

/**
 * One-time endpoint to create the very first SUPER_ADMIN on a fresh installation.
 * Permanently disabled once any user exists.
 * Requires BOOTSTRAP_SECRET env var to prevent unauthorized use.
 */
const bootstrap = async (payload: BootstrapInput): Promise<{ user: SafeUser; token: string }> => {
  const secret = process.env.BOOTSTRAP_SECRET;
  if (!secret) {
    logger.warn("Bootstrap attempted while BOOTSTRAP_SECRET is not configured.");
    throw new ErrorHandler(StatusCodes.FORBIDDEN, "Bootstrap is not enabled on this server.");
  }

  if (payload.bootstrapSecret !== secret) {
    throw new ErrorHandler(StatusCodes.FORBIDDEN, "Invalid bootstrap secret.");
  }

  const userCount = await prisma.user.count();
  if (userCount > 0) {
    throw new ErrorHandler(
      StatusCodes.FORBIDDEN,
      "Bootstrap is only available on a fresh installation. Use the invite flow to add more admins.",
    );
  }

  // Force SUPER_ADMIN — ignore any role in the payload
  const result = await register({
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    password: payload.password,
    timezone: payload.timezone,
    role: UserRole.SUPER_ADMIN,
  });

  logger.info("Bootstrap super admin provisioned.", {
    userId: result.user.id,
  });

  return result;
};
export { bootstrap, login, logout, register };
