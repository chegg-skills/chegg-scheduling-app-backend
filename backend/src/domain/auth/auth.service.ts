import { UserRole } from "@prisma/client";
import bcrypt from "bcrypt";
import { timingSafeEqual } from "node:crypto";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { rethrowPrismaError } from "../../shared/error/prismaError";
import { getRequestLogger } from "../../shared/logging/requestContext";
import { buildAuthToken } from "../../shared/auth/jwtUtils";
import {
  revokeAllRefreshTokensForUser,
  revokeRefreshToken,
  rotateRefreshToken,
  type RefreshTokenMeta,
} from "../../shared/auth/refreshTokenUtils";
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

    getRequestLogger().info({ userId: safeUser.id, role: safeUser.role }, "User registered successfully.");

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
    getRequestLogger().warn({ userId: user.id, role: user.role }, "Inactive account login attempt blocked.");
    throw new ErrorHandler(
      StatusCodes.FORBIDDEN,
      "This account is inactive. Please contact an administrator.",
    );
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    getRequestLogger().warn({ userId: user.id, lockedUntil: user.lockedUntil.toISOString() }, "Locked account login attempt blocked.");
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
      getRequestLogger().warn({ userId: user.id, attempts: nextFailedAttempts, lockedUntil: lockedUntil?.toISOString() }, "User account locked after repeated failed login attempts.");
      throw new ErrorHandler(
        StatusCodes.LOCKED,
        "Too many failed attempts. Account is temporarily locked.",
      );
    }

    getRequestLogger().warn({ userId: user.id, failedLoginAttempts: nextFailedAttempts }, "Invalid password attempt recorded.");

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

  getRequestLogger().info({ userId: safeUser.id, role: safeUser.role }, "User logged in successfully.");

  return {
    user: safeUser,
    token: buildAuthToken(safeUser),
  };
};

/**
 * Revokes the presented refresh token so the session cannot be resumed after
 * logout. Best-effort by design — a missing or already-invalid token still
 * results in a successful logout rather than an error the client cannot act on.
 */
const logout = async (rawRefreshToken?: string): Promise<{ message: string }> => {
  if (rawRefreshToken) {
    try {
      await revokeRefreshToken(rawRefreshToken);
    } catch (error) {
      // Genuinely best-effort, as documented. Letting a DB fault propagate would
      // 500 before the controller clears the cookies, leaving the browser holding
      // a live session while the user believes they logged out — the worse outcome
      // of the two. Logged loudly because the token does outlive this request.
      getRequestLogger().error({ error }, "Refresh token revocation failed during logout.");
    }
  }

  return { message: "Logged out successfully." };
};

/**
 * Exchanges a valid refresh token for a new access token, rotating the refresh
 * token in the process.
 *
 * The account is re-checked here (not just at `authenticate` time) so a user
 * deactivated mid-session cannot keep extending it.
 */
const refresh = async (
  rawRefreshToken: string | undefined,
  meta: RefreshTokenMeta = {},
): Promise<{ user: SafeUser; token: string; refreshToken: string }> => {
  if (!rawRefreshToken) {
    throw new ErrorHandler(StatusCodes.UNAUTHORIZED, "Session expired. Please log in again.");
  }

  const result = await rotateRefreshToken(rawRefreshToken, meta);

  if (result.status === "reused") {
    throw new ErrorHandler(
      StatusCodes.UNAUTHORIZED,
      "This session was revoked for security reasons. Please log in again.",
    );
  }

  if (result.status === "invalid") {
    throw new ErrorHandler(StatusCodes.UNAUTHORIZED, "Session expired. Please log in again.");
  }

  const user = await prisma.user.findUnique({ where: { id: result.userId } });

  if (!user || !user.isActive) {
    await revokeAllRefreshTokensForUser(result.userId);
    throw new ErrorHandler(
      StatusCodes.UNAUTHORIZED,
      "This account is no longer active. Please contact an administrator.",
    );
  }

  const safeUser = toSafeUser(user);

  return {
    user: safeUser,
    token: buildAuthToken(safeUser),
    refreshToken: result.token,
  };
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
    getRequestLogger().warn("Bootstrap attempted while BOOTSTRAP_SECRET is not configured.");
    throw new ErrorHandler(StatusCodes.FORBIDDEN, "Bootstrap is not enabled on this server.");
  }

  const expectedBuf = Buffer.from(secret);
  const givenBuf = Buffer.from(payload.bootstrapSecret ?? "");
  if (expectedBuf.length !== givenBuf.length || !timingSafeEqual(expectedBuf, givenBuf)) {
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

  getRequestLogger().info({ userId: result.user.id }, "Bootstrap super admin provisioned.");

  return result;
};
export { bootstrap, login, logout, refresh, register };
