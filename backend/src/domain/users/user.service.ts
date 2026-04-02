import { Prisma, UserRole } from "@prisma/client";
import bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import {
  SALT_ROUNDS,
  type CallerContext,
  type SafeUser,
  normalizeEmail,
  toSafeUser,
  validateTimezone,
  validateZoomIsvLink,
} from "../../shared/utils/userUtils";

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

const isValidRole = (role: string): role is UserRole => {
  return Object.values(UserRole).includes(role as UserRole);
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
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 50));
  const skip = (page - 1) * pageSize;
  const searchTerms = options.search?.trim().split(/\s+/).filter(Boolean) ?? [];

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

const readUser = async (userId: string): Promise<any> => {
  if (!userId?.trim()) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "userId is required.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      teamMemberships: {
        include: {
          team: true,
        },
      },
      hostedEvents: {
        include: {
          event: {
            include: {
              offering: true,
              interactionType: true,
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
  if (!userId?.trim()) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "userId is required.");
  }

  // TEAM_ADMIN cannot change roles, active status, or touch SUPER_ADMIN accounts.
  if (caller.role === UserRole.TEAM_ADMIN) {
    if (payload.role !== undefined) {
      throw new ErrorHandler(
        StatusCodes.FORBIDDEN,
        "You do not have permission to change user roles.",
      );
    }
    if (payload.isActive !== undefined) {
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
  if (payload.role !== undefined || payload.isActive !== undefined) {
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isActive: true },
    });
    if (!targetUser) {
      throw new ErrorHandler(StatusCodes.NOT_FOUND, "User not found.");
    }
    if (targetUser.role === UserRole.SUPER_ADMIN) {
      const isDemoting =
        payload.role !== undefined && payload.role !== UserRole.SUPER_ADMIN;
      const isDeactivating = payload.isActive === false;
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

  if (payload.firstName !== undefined) {
    const value = payload.firstName.trim();
    if (!value) {
      throw new ErrorHandler(
        StatusCodes.BAD_REQUEST,
        "firstName cannot be empty.",
      );
    }
    updateData.firstName = value;
  }

  if (payload.lastName !== undefined) {
    const value = payload.lastName.trim();
    if (!value) {
      throw new ErrorHandler(
        StatusCodes.BAD_REQUEST,
        "lastName cannot be empty.",
      );
    }
    updateData.lastName = value;
  }

  if (payload.email !== undefined) {
    const value = payload.email.trim();
    if (!value) {
      throw new ErrorHandler(StatusCodes.BAD_REQUEST, "email cannot be empty.");
    }
    updateData.email = normalizeEmail(value);
  }

  if (payload.password !== undefined) {
    const value = payload.password.trim();
    if (value.length < 8) {
      throw new ErrorHandler(
        StatusCodes.BAD_REQUEST,
        "Password must be at least 8 characters long.",
      );
    }
    updateData.password = await bcrypt.hash(value, SALT_ROUNDS);
  }

  if (payload.phoneNumber !== undefined) {
    updateData.phoneNumber = payload.phoneNumber?.trim() || null;
  }

  if (payload.country !== undefined) {
    updateData.country = payload.country?.trim() || null;
  }

  if (payload.avatarUrl !== undefined) {
    updateData.avatarUrl = payload.avatarUrl?.trim() || null;
  }

  if (payload.preferredLanguage !== undefined) {
    updateData.preferredLanguage = payload.preferredLanguage?.trim() || "en";
  }

  if (payload.zoomIsvLink !== undefined) {
    const value = payload.zoomIsvLink.trim();
    updateData.zoomIsvLink = value ? validateZoomIsvLink(value) : null;
  }

  if (payload.role !== undefined) {
    const role = payload.role.trim();
    if (!isValidRole(role)) {
      throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Invalid user role.");
    }
    updateData.role = role;
  }

  if (payload.timezone !== undefined) {
    const timezone = payload.timezone.trim();
    if (!timezone) {
      throw new ErrorHandler(
        StatusCodes.BAD_REQUEST,
        "timezone cannot be empty.",
      );
    }
    updateData.timezone = validateTimezone(timezone);
  }

  if (payload.isActive !== undefined) {
    updateData.isActive = Boolean(payload.isActive);
  }

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
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new ErrorHandler(StatusCodes.NOT_FOUND, "User not found.");
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ErrorHandler(
        StatusCodes.CONFLICT,
        "A user with this email already exists.",
      );
    }

    throw error;
  }
};

const deleteUser = async (
  userId: string,
  caller: CallerContext,
): Promise<SafeUser> => {
  if (!userId?.trim()) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "userId is required.");
  }

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
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      "User account is already inactive.",
    );
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
  if (!userId?.trim()) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "userId is required.");
  }

  const updateData: Prisma.UserUpdateInput = {};

  if (payload.firstName !== undefined) {
    const value = payload.firstName.trim();
    if (!value) {
      throw new ErrorHandler(StatusCodes.BAD_REQUEST, "firstName cannot be empty.");
    }
    updateData.firstName = value;
  }

  if (payload.lastName !== undefined) {
    const value = payload.lastName.trim();
    if (!value) {
      throw new ErrorHandler(StatusCodes.BAD_REQUEST, "lastName cannot be empty.");
    }
    updateData.lastName = value;
  }

  if (payload.password !== undefined) {
    const value = payload.password.trim();
    if (value.length < 8) {
      throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Password must be at least 8 characters long.");
    }
    updateData.password = await bcrypt.hash(value, SALT_ROUNDS);
  }

  if (payload.phoneNumber !== undefined) {
    updateData.phoneNumber = payload.phoneNumber?.trim() || null;
  }

  if (payload.country !== undefined) {
    updateData.country = payload.country?.trim() || null;
  }

  if (payload.avatarUrl !== undefined) {
    updateData.avatarUrl = payload.avatarUrl?.trim() || null;
  }

  if (payload.preferredLanguage !== undefined) {
    updateData.preferredLanguage = payload.preferredLanguage?.trim() || "en";
  }

  if (payload.zoomIsvLink !== undefined) {
    const value = payload.zoomIsvLink.trim();
    updateData.zoomIsvLink = value ? validateZoomIsvLink(value) : null;
  }

  if (payload.timezone !== undefined) {
    const timezone = payload.timezone.trim();
    if (!timezone) {
      throw new ErrorHandler(StatusCodes.BAD_REQUEST, "timezone cannot be empty.");
    }
    updateData.timezone = validateTimezone(timezone);
  }

  if (Object.keys(updateData).length === 0) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "At least one field is required to update profile.");
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return toSafeUser(updatedUser);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new ErrorHandler(StatusCodes.NOT_FOUND, "User not found.");
    }
    throw error;
  }
};

export { deleteUser, listUsers, readUser, updateUser, updateMyProfile };
