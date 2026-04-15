import crypto from "crypto";
import bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes";
import { UserRole } from "@prisma/client";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { prisma } from "../../shared/db/prisma";
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
import { AcceptInviteSchema, CreateInviteSchema } from "./invite.schema";

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
  payload: CreateInviteInput,
): Promise<{
  id: string;
  email: string;
  role: UserRole;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}> => {
  const validated = CreateInviteSchema.body.parse(payload);
  const normalizedEmail = normalizeEmail(validated.email);

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new ErrorHandler(StatusCodes.CONFLICT, "A user with this email already exists.");
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
      "An active invite already exists for this email. Please resend or revoke it first.",
    );
  }

  const token = generateInviteToken();
  const expiresAt = getInviteExpiryDate();

  const invite = await prisma.userInvite.create({
    data: {
      email: normalizedEmail,
      role: validated.role,
      token,
      expiresAt,
      createdBy: payload.createdByAdminId,
    },
  });

  logger.info("User invite created successfully.", {
    inviteId: invite.id,
    createdByAdminId: payload.createdByAdminId,
    role: invite.role,
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
  payload: AcceptInviteInput,
): Promise<{ user: SafeUser; token: string; invitedById: string }> => {
  const validated = AcceptInviteSchema.body.parse(payload);

  const invite = await prisma.userInvite.findUnique({
    where: { token: validated.token },
  });

  if (!invite) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Invalid invite token.");
  }

  if (invite.acceptedAt) {
    throw new ErrorHandler(StatusCodes.CONFLICT, "This invite has already been accepted.");
  }

  if (new Date() > invite.expiresAt) {
    throw new ErrorHandler(StatusCodes.GONE, "This invite has expired. Please request a new one.");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invite.email },
  });

  if (existingUser) {
    throw new ErrorHandler(StatusCodes.CONFLICT, "A user with this email already exists.");
  }

  const timezone = validated.timezone ? validateTimezone(validated.timezone) : "UTC";

  const hashedPassword = await bcrypt.hash(validated.password, SALT_ROUNDS);

  let createdUser: Awaited<ReturnType<typeof prisma.user.create>>;
  try {
    [createdUser] = await prisma.$transaction([
      prisma.user.create({
        data: {
          firstName: validated.firstName,
          lastName: validated.lastName,
          email: invite.email,
          publicBookingSlug: createPublicBookingSlug(
            `${validated.firstName} ${validated.lastName}`,
            "coach",
          ),
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
    return rethrowPrismaError(error, {
      P2002: {
        status: StatusCodes.CONFLICT,
        message: "A user with this email already exists.",
      },
    });
  }

  const safeUser = toSafeUser(createdUser);

  logger.info("Invite accepted and user account provisioned.", {
    inviteId: invite.id,
    userId: safeUser.id,
    role: safeUser.role,
  });

  return {
    user: safeUser,
    token: buildAuthToken(safeUser),
    invitedById: invite.createdBy,
  };
};

export { createInvite, acceptInvite };
