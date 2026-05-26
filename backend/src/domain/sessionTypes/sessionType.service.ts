import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { rethrowPrismaError } from "../../shared/error/prismaError";
import type { CallerContext } from "../../shared/utils/userUtils";
import { UserRole, type SessionType } from "@prisma/client";

const assertSuperAdmin = (caller: CallerContext): void => {
  if (caller.role !== UserRole.SUPER_ADMIN) {
    throw new ErrorHandler(StatusCodes.FORBIDDEN, "Only super admins can manage session types.");
  }
};

const loadOrThrow = async (sessionTypeId: string): Promise<SessionType> => {
  const sessionType = await prisma.sessionType.findUnique({ where: { id: sessionTypeId } });
  if (!sessionType) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Session type not found.");
  }
  return sessionType;
};

const createSessionType = async (
  payload: {
    slug: string;
    name: string;
    description?: string | null;
    isActive?: boolean;
    sortOrder?: number;
  },
  caller: CallerContext,
): Promise<SessionType> => {
  assertSuperAdmin(caller);

  try {
    return await prisma.sessionType.create({
      data: {
        slug: payload.slug,
        name: payload.name,
        description: payload.description ?? null,
        isActive: payload.isActive ?? true,
        sortOrder: payload.sortOrder ?? 0,
        createdById: caller.id,
        updatedById: caller.id,
      },
    });
  } catch (error) {
    return rethrowPrismaError(error, {
      P2002: { status: StatusCodes.CONFLICT, message: "A session type with this slug already exists." },
    });
  }
};

const listSessionTypes = async (): Promise<SessionType[]> => {
  return prisma.sessionType.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
};

const getSessionType = async (sessionTypeId: string): Promise<SessionType> => {
  return loadOrThrow(sessionTypeId);
};

const updateSessionType = async (
  sessionTypeId: string,
  payload: {
    name?: string;
    description?: string | null;
    isActive?: boolean;
    sortOrder?: number;
  },
  caller: CallerContext,
): Promise<SessionType> => {
  assertSuperAdmin(caller);

  const data: Record<string, unknown> = { updatedById: caller.id };
  if (payload.name !== undefined) data.name = payload.name;
  if (payload.description !== undefined) data.description = payload.description;
  if (payload.isActive !== undefined) data.isActive = payload.isActive;
  if (payload.sortOrder !== undefined) data.sortOrder = payload.sortOrder;

  try {
    return await prisma.sessionType.update({ where: { id: sessionTypeId }, data });
  } catch (error) {
    return rethrowPrismaError(error, {
      P2025: { status: StatusCodes.NOT_FOUND, message: "Session type not found." },
    });
  }
};

const deleteSessionType = async (sessionTypeId: string, caller: CallerContext): Promise<void> => {
  assertSuperAdmin(caller);

  await prisma.$transaction(async (tx) => {
    const sessionType = await tx.sessionType.findUnique({
      where: { id: sessionTypeId },
      include: { _count: { select: { events: true, sections: true } } },
    });

    if (!sessionType) {
      throw new ErrorHandler(StatusCodes.NOT_FOUND, "Session type not found.");
    }

    if (sessionType._count.events > 0) {
      throw new ErrorHandler(
        StatusCodes.CONFLICT,
        `Cannot delete session type because ${sessionType._count.events} event(s) reference it.`,
      );
    }

    if (sessionType._count.sections > 0) {
      throw new ErrorHandler(
        StatusCodes.CONFLICT,
        `Cannot delete session type because it is used in ${sessionType._count.sections} booking page section(s).`,
      );
    }

    await tx.sessionType.delete({ where: { id: sessionTypeId } });
  });
};

export { createSessionType, listSessionTypes, getSessionType, updateSessionType, deleteSessionType };
