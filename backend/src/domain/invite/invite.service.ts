import crypto from "crypto";
import bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes";
import { Prisma, UserRole } from "@prisma/client";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { prisma } from "../../shared/db/prisma";
import { rethrowPrismaError } from "../../shared/error/prismaError";
import { logger } from "../../shared/logging/logger";
import { buildAuthToken } from "../../shared/auth/jwtUtils";
import { createPublicBookingSlug } from "../../shared/utils/publicBookingSlug";
import {
  SALT_ROUNDS,
  type SafeUser,
  normalizeEmail,
  validateTimezone,
  toSafeUser,
} from "../../shared/utils/userUtils";
import { AcceptInviteSchema, CreateInviteSchema, ListInvitesSchema } from "./invite.schema";
import { resolvePagination } from "../../shared/utils/pagination";

const INVITE_EXPIRY_DAYS = Number(process.env.INVITE_EXPIRY_DAYS ?? 7);

type CreateInviteInput = {
  email: string;
  role: UserRole;
  createdByAdminId: string;
  callerRole: UserRole;
  requiresSso?: boolean;
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
  requiresSso: boolean;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}> => {
  const validated = CreateInviteSchema.body.parse(payload);

  if (payload.callerRole === UserRole.TEAM_ADMIN && validated.role !== UserRole.COACH) {
    throw new ErrorHandler(StatusCodes.FORBIDDEN, "Team admins can only invite coaches.");
  }

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
      requiresSso: validated.requiresSso ?? false,
    },
  });

  logger.info({ inviteId: invite.id, createdByAdminId: payload.createdByAdminId, role: invite.role, requiresSso: invite.requiresSso }, "User invite created successfully.");

  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    requiresSso: invite.requiresSso,
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

  if (invite.requiresSso) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "This invite requires SSO authentication. Use the SSO sign-in link sent in your invite email.",
    );
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

  logger.info({ inviteId: invite.id, userId: safeUser.id, role: safeUser.role }, "Invite accepted and user account provisioned.");

  return {
    user: safeUser,
    token: buildAuthToken(safeUser),
    invitedById: invite.createdBy,
  };
};

type InviteValidationResult =
  | { valid: true; email: string; role: UserRole; requiresSso: boolean }
  | { valid: false; reason: "not_found" | "already_accepted" | "expired" };

const validateInvite = async (token: string): Promise<InviteValidationResult> => {
  const invite = await prisma.userInvite.findUnique({ where: { token } });

  if (!invite) return { valid: false, reason: "not_found" };
  if (invite.acceptedAt) return { valid: false, reason: "already_accepted" };
  if (new Date() > invite.expiresAt) return { valid: false, reason: "expired" };

  return {
    valid: true,
    email: invite.email,
    role: invite.role,
    requiresSso: invite.requiresSso,
  };
};

// ─── Invite Audit Trail ───────────────────────────────────────────────────────

export type InviteStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

type InviteWithCreator = {
  id: string;
  email: string;
  role: UserRole;
  status: InviteStatus;
  requiresSso: boolean;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  createdByUser: { firstName: string; lastName: string; email: string };
};

function computeInviteStatus(invite: {
  acceptedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
}): InviteStatus {
  if (invite.acceptedAt) return "ACCEPTED";
  if (invite.revokedAt) return "REVOKED";
  if (invite.expiresAt < new Date()) return "EXPIRED";
  return "PENDING";
}

type ListInvitesOptions = {
  status?: InviteStatus;
  role?: UserRole;
  page?: number;
  pageSize?: number;
};

const listInvites = async (
  options: ListInvitesOptions,
  callerId: string,
  callerRole: UserRole,
): Promise<{
  invites: InviteWithCreator[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}> => {
  const validated = ListInvitesSchema.query.parse(options);
  const { page, pageSize, skip } = resolvePagination(validated);

  const now = new Date();
  const where: Prisma.UserInviteWhereInput = {};

  // TEAM_ADMIN can only see invites they created
  if (callerRole === UserRole.TEAM_ADMIN) {
    where.createdBy = callerId;
  }

  if (validated.role) {
    where.role = validated.role;
  }

  if (validated.status) {
    switch (validated.status) {
      case "PENDING":
        where.acceptedAt = null;
        where.revokedAt = null;
        where.expiresAt = { gt: now };
        break;
      case "ACCEPTED":
        where.acceptedAt = { not: null };
        break;
      case "EXPIRED":
        where.acceptedAt = null;
        where.revokedAt = null;
        where.expiresAt = { lte: now };
        break;
      case "REVOKED":
        where.revokedAt = { not: null };
        break;
    }
  }

  const [rows, total] = await prisma.$transaction([
    prisma.userInvite.findMany({
      where,
      include: {
        createdByUser: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.userInvite.count({ where }),
  ]);

  return {
    invites: rows.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      status: computeInviteStatus(row),
      requiresSso: row.requiresSso,
      expiresAt: row.expiresAt,
      acceptedAt: row.acceptedAt,
      revokedAt: row.revokedAt,
      createdAt: row.createdAt,
      createdByUser: row.createdByUser,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

const revokeInvite = async (
  id: string,
  callerId: string,
  callerRole: UserRole,
): Promise<InviteWithCreator> => {
  const invite = await prisma.userInvite.findUnique({
    where: { id },
    include: {
      createdByUser: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  if (!invite) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Invite not found.");
  }
  if (invite.acceptedAt) {
    throw new ErrorHandler(StatusCodes.CONFLICT, "This invite has already been accepted.");
  }
  if (invite.revokedAt) {
    throw new ErrorHandler(StatusCodes.CONFLICT, "This invite has already been revoked.");
  }
  if (invite.expiresAt < new Date()) {
    throw new ErrorHandler(StatusCodes.CONFLICT, "This invite has already expired.");
  }
  if (callerRole === UserRole.TEAM_ADMIN && invite.createdBy !== callerId) {
    throw new ErrorHandler(StatusCodes.FORBIDDEN, "You can only revoke invites you created.");
  }

  const updated = await prisma.userInvite.update({
    where: { id },
    data: { revokedAt: new Date() },
    include: {
      createdByUser: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  logger.info({ inviteId: id, revokedBy: callerId }, "Invite revoked.");

  return {
    id: updated.id,
    email: updated.email,
    role: updated.role,
    status: computeInviteStatus(updated),
    requiresSso: updated.requiresSso,
    expiresAt: updated.expiresAt,
    acceptedAt: updated.acceptedAt,
    revokedAt: updated.revokedAt,
    createdAt: updated.createdAt,
    createdByUser: updated.createdByUser,
  };
};

export { createInvite, acceptInvite, validateInvite, listInvites, revokeInvite };
