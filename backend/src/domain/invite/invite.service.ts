import crypto from "crypto";
import bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes";
import { Prisma, UserRole } from "@prisma/client";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { prisma } from "../../shared/db/prisma";
import { SALT_ROUNDS, type SafeUser, normalizeEmail, validateTimezone, toSafeUser } from "../../shared/utils/userUtils";
import { buildAuthToken } from "../../shared/utils/jwtUtils";
import { createPublicBookingSlug } from "../../shared/utils/publicBookingSlug";

const INVITE_EXPIRY_DAYS = Number(process.env.INVITE_EXPIRY_DAYS ?? 7);

type CreateInviteInput = {
  email: string;
  role: UserRole;
  createdByAdminId: string;
};

type AcceptInviteInput = {
  token: string;
  firstName: string;
  lastName: string;
  password: string;
  timezone?: string;
};

const generateInviteToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

const getInviteExpiryDate = (): Date => {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + INVITE_EXPIRY_DAYS);
  return expiryDate;
};

const createInvite = async (
  payload: CreateInviteInput
): Promise<{
  id: string;
  email: string;
  role: UserRole;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}> => {
  const email = payload.email?.trim();
  if (!email) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "email is required.");
  }

  const normalizedEmail = normalizeEmail(email);

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      "A user with this email already exists."
    );
  }

  const existingInvite = await prisma.userInvite.findFirst({
    where: {
      email: normalizedEmail,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (existingInvite) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      "An active invite already exists for this email. Please resend or revoke it first."
    );
  }

  if (!Object.values(UserRole).includes(payload.role)) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Invalid user role.");
  }

  const token = generateInviteToken();
  const expiresAt = getInviteExpiryDate();

  const invite = await prisma.userInvite.create({
    data: {
      email: normalizedEmail,
      role: payload.role,
      token,
      expiresAt,
      createdBy: payload.createdByAdminId,
    },
  });

  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    token: invite.token,
    expiresAt: invite.expiresAt,
    createdAt: invite.createdAt,
  };
};

const acceptInvite = async (
  payload: AcceptInviteInput
): Promise<{ user: SafeUser; token: string; invitedById: string }> => {
  const token = payload.token?.trim();
  const firstName = payload.firstName?.trim();
  const lastName = payload.lastName?.trim();
  const password = payload.password?.trim();

  if (!token) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "token is required.");
  }

  if (!firstName || !lastName || !password) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "firstName, lastName, and password are required."
    );
  }

  if (password.length < 8) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "Password must be at least 8 characters long."
    );
  }

  const invite = await prisma.userInvite.findUnique({
    where: { token },
  });

  if (!invite) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Invalid invite token.");
  }

  if (invite.acceptedAt) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      "This invite has already been accepted."
    );
  }

  if (new Date() > invite.expiresAt) {
    throw new ErrorHandler(
      StatusCodes.GONE,
      "This invite has expired. Please request a new one."
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invite.email },
  });

  if (existingUser) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      "A user with this email already exists."
    );
  }

  const timezone = payload.timezone
    ? validateTimezone(payload.timezone.trim())
    : "UTC";

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  let createdUser: Awaited<ReturnType<typeof prisma.user.create>>;
  try {
    [createdUser] = await prisma.$transaction([
      prisma.user.create({
        data: {
          firstName,
          lastName,
          email: invite.email,
          publicBookingSlug: createPublicBookingSlug(`${firstName} ${lastName}`, 'coach'),
          password: hashedPassword,
          role: invite.role,
          timezone,
        },
      }),
      prisma.userInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
    ]);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ErrorHandler(
        StatusCodes.CONFLICT,
        "A user with this email already exists."
      );
    }
    throw error;
  }

  const safeUser = toSafeUser(createdUser);

  return {
    user: safeUser,
    token: buildAuthToken(safeUser),
    invitedById: invite.createdBy,
  };
};

export { createInvite, acceptInvite };
