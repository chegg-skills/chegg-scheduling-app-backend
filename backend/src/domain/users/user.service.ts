import { Prisma, UserRole } from "@prisma/client";
import bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { rethrowPrismaError } from "../../shared/error/prismaError";
import { resolvePagination } from "../../shared/utils/pagination";
import { createPublicBookingSlug } from "../../shared/utils/publicBookingSlug";
import {
  SALT_ROUNDS,
  type CallerContext,
  type SafeUser,
  normalizeEmail,
  toSafeUser,
  validateTimezone,
  validateZoomIsvLink,
} from "../../shared/utils/userUtils";
import { ListUsersSchema, UpdateUserSchema, UpdateMyProfileSchema } from "./user.schema";

type ListUsersOptions = {
  page?: number;
  pageSize?: number;
  search?: string;
};

type UpdateUserInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  phoneNumber?: string;
  country?: string;
  avatarUrl?: string;
  role?: string;
  timezone?: string;
  preferredLanguage?: string;
  zoomIsvLink?: string;
  isActive?: boolean;
};

type UpdateMyProfileInput = {
  firstName?: string;
  lastName?: string;
  password?: string;
  phoneNumber?: string;
  country?: string;
  avatarUrl?: string;
  timezone?: string;
  preferredLanguage?: string;
  zoomIsvLink?: string;
};

const assignCoachPublicBookingSlug = async (
  userId: string,
  payload: { firstName?: string; lastName?: string },
  updateData: Prisma.UserUpdateInput,
): Promise<void> => {
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      publicBookingSlug: true,
      firstName: true,
      lastName: true,
    },
  });

  if (!currentUser || currentUser.role !== UserRole.COACH || currentUser.publicBookingSlug) {
    return;
  }

  const firstName = payload.firstName || currentUser.firstName;
  const lastName = payload.lastName || currentUser.lastName;
  updateData.publicBookingSlug = createPublicBookingSlug(`${firstName} ${lastName}`, "coach");
};

const listUsers = async (
  options: ListUsersOptions = {},
): Promise<{
  users: SafeUser[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}> => {
  const validatedOptions = ListUsersSchema.query.parse(options);
  const { page, pageSize, skip } = resolvePagination(validatedOptions);
  const searchTerms = validatedOptions.search?.trim().split(/\s+/).filter(Boolean) ?? [];

  const where: Prisma.UserWhereInput = searchTerms.length
    ? {
        AND: searchTerms.map((term) => ({
          OR: [
            {
              firstName: {
                contains: term,
                mode: "insensitive",
              },
            },
            {
              lastName: {
                contains: term,
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: term,
                mode: "insensitive",
              },
            },
          ],
        })),
      }
    : {};

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users.map(toSafeUser),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

const readUser = async (userId: string): Promise<SafeUser> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      teamMemberships: {
        include: {
          team: true,
        },
      },
      coachedEvents: {
        include: {
          event: {
            include: {
              offering: true,
            },
          },
        },
      },
      weeklyAvailability: true,
      availabilityExceptions: true,
    },
  });

  if (!user) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "User not found.");
  }

  return toSafeUser(user as any);
};

const updateUser = async (
  userId: string,
  payload: UpdateUserInput,
  caller: CallerContext,
): Promise<SafeUser> => {
  const validated = await UpdateUserSchema.body.parseAsync(payload);

  // TEAM_ADMIN cannot change roles, active status, or touch SUPER_ADMIN accounts.
  if (caller.role === UserRole.TEAM_ADMIN) {
    if (validated.role !== undefined) {
      throw new ErrorHandler(
        StatusCodes.FORBIDDEN,
        "You do not have permission to change user roles.",
      );
    }
    if (validated.isActive !== undefined) {
      throw new ErrorHandler(
        StatusCodes.FORBIDDEN,
        "You do not have permission to change user active status.",
      );
    }

    const targetForPermCheck = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!targetForPermCheck) {
      throw new ErrorHandler(StatusCodes.NOT_FOUND, "User not found.");
    }
    if (targetForPermCheck.role === UserRole.SUPER_ADMIN) {
      throw new ErrorHandler(
        StatusCodes.FORBIDDEN,
        "You do not have permission to modify a SUPER_ADMIN account.",
      );
    }
  }

  // Prevent removing the last active SUPER_ADMIN (demotion or deactivation).
  if (validated.role !== undefined || validated.isActive !== undefined) {
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isActive: true },
    });
    if (!targetUser) {
      throw new ErrorHandler(StatusCodes.NOT_FOUND, "User not found.");
    }
    if (targetUser.role === UserRole.SUPER_ADMIN) {
      const isDemoting = validated.role !== undefined && validated.role !== UserRole.SUPER_ADMIN;
      const isDeactivating = validated.isActive === false;
      if (isDemoting || isDeactivating) {
        const otherActiveSuperAdmins = await prisma.user.count({
          where: {
            role: UserRole.SUPER_ADMIN,
            isActive: true,
            id: { not: userId },
          },
        });
        if (otherActiveSuperAdmins === 0) {
          throw new ErrorHandler(
            StatusCodes.FORBIDDEN,
            "Cannot remove the last active SUPER_ADMIN. Promote another admin first.",
          );
        }
      }
    }
  }

  const updateData: Prisma.UserUpdateInput = {};

  if (validated.firstName !== undefined) updateData.firstName = validated.firstName;
  if (validated.lastName !== undefined) updateData.lastName = validated.lastName;
  if (validated.email !== undefined) updateData.email = normalizeEmail(validated.email);
  if (validated.password !== undefined) {
    updateData.password = await bcrypt.hash(validated.password, SALT_ROUNDS);
  }
  if (validated.phoneNumber !== undefined) updateData.phoneNumber = validated.phoneNumber;
  if (validated.country !== undefined) updateData.country = validated.country;
  if (validated.avatarUrl !== undefined) updateData.avatarUrl = validated.avatarUrl;
  if (validated.role !== undefined) updateData.role = validated.role;
  if (validated.isActive !== undefined) updateData.isActive = validated.isActive;
  if (validated.preferredLanguage !== undefined)
    updateData.preferredLanguage = validated.preferredLanguage;
  if (validated.timezone !== undefined) updateData.timezone = validateTimezone(validated.timezone);
  if (validated.zoomIsvLink !== undefined) {
    updateData.zoomIsvLink = validated.zoomIsvLink
      ? validateZoomIsvLink(validated.zoomIsvLink)
      : null;
  }

  await assignCoachPublicBookingSlug(userId, validated, updateData);

  if (Object.keys(updateData).length === 0) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "At least one field is required to update user.",
    );
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return toSafeUser(updatedUser);
  } catch (error) {
    return rethrowPrismaError(error, {
      P2025: { status: StatusCodes.NOT_FOUND, message: "User not found." },
      P2002: {
        status: StatusCodes.CONFLICT,
        message: "A user with this email already exists.",
      },
    });
  }
};

const deleteUser = async (userId: string, caller: CallerContext): Promise<SafeUser> => {
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true },
  });

  if (!targetUser) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "User not found.");
  }

  // TEAM_ADMIN can only deactivate COACH accounts.
  if (caller.role === UserRole.TEAM_ADMIN && targetUser.role !== UserRole.COACH) {
    throw new ErrorHandler(
      StatusCodes.FORBIDDEN,
      "You do not have permission to deactivate this user.",
    );
  }

  if (!targetUser.isActive) {
    throw new ErrorHandler(StatusCodes.CONFLICT, "User account is already inactive.");
  }

  // Prevent deactivating the last active SUPER_ADMIN.
  if (targetUser.role === UserRole.SUPER_ADMIN) {
    const otherActiveSuperAdmins = await prisma.user.count({
      where: {
        role: UserRole.SUPER_ADMIN,
        isActive: true,
        id: { not: userId },
      },
    });
    if (otherActiveSuperAdmins === 0) {
      throw new ErrorHandler(
        StatusCodes.FORBIDDEN,
        "Cannot deactivate the last active SUPER_ADMIN. Promote another admin first.",
      );
    }
  }

  const deactivatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  return toSafeUser(deactivatedUser);
};

const updateMyProfile = async (
  userId: string,
  payload: UpdateMyProfileInput,
): Promise<SafeUser> => {
  const validated = await UpdateMyProfileSchema.body.parseAsync(payload);

  const updateData: Prisma.UserUpdateInput = {};
  if (validated.firstName !== undefined) updateData.firstName = validated.firstName;
  if (validated.lastName !== undefined) updateData.lastName = validated.lastName;
  if (validated.password !== undefined) {
    updateData.password = await bcrypt.hash(validated.password, SALT_ROUNDS);
  }
  if (validated.phoneNumber !== undefined) updateData.phoneNumber = validated.phoneNumber;
  if (validated.country !== undefined) updateData.country = validated.country;
  if (validated.avatarUrl !== undefined) updateData.avatarUrl = validated.avatarUrl;
  if (validated.preferredLanguage !== undefined)
    updateData.preferredLanguage = validated.preferredLanguage;
  if (validated.timezone !== undefined) updateData.timezone = validateTimezone(validated.timezone);
  if (validated.zoomIsvLink !== undefined) {
    updateData.zoomIsvLink = validated.zoomIsvLink
      ? validateZoomIsvLink(validated.zoomIsvLink)
      : null;
  }

  await assignCoachPublicBookingSlug(userId, validated, updateData);

  if (Object.keys(updateData).length === 0) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "At least one field is required to update profile.",
    );
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return toSafeUser(updatedUser);
  } catch (error) {
    return rethrowPrismaError(error, {
      P2025: { status: StatusCodes.NOT_FOUND, message: "User not found." },
    });
  }
};

export { deleteUser, listUsers, readUser, updateUser, updateMyProfile };
