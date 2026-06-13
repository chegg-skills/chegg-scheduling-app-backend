import { StatusCodes } from "http-status-codes";
import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { rethrowPrismaError } from "../../shared/error/prismaError";
import type { CallerContext } from "../../shared/utils/userUtils";

const assertSuperAdmin = (caller: CallerContext): void => {
  if (caller.role !== UserRole.SUPER_ADMIN) {
    throw new ErrorHandler(StatusCodes.FORBIDDEN, "Only super admins can manage booking directories.");
  }
};

const bookingDirectoryInclude = Prisma.validator<Prisma.BookingDirectoryInclude>()({
  sections: {
    orderBy: { sortOrder: "asc" },
    include: {
      eventType: true,
      teams: {
        orderBy: { sortOrder: "asc" },
        include: {
          team: { select: { id: true, name: true, publicBookingSlug: true, isActive: true } },
        },
      },
    },
  },
});

type SafeBookingDirectory = Prisma.BookingDirectoryGetPayload<{ include: typeof bookingDirectoryInclude }>;

const loadOrThrow = async (directoryId: string): Promise<SafeBookingDirectory> => {
  const directory = await prisma.bookingDirectory.findUnique({
    where: { id: directoryId },
    include: bookingDirectoryInclude,
  });
  if (!directory) throw new ErrorHandler(StatusCodes.NOT_FOUND, "Booking directory not found.");
  return directory;
};

const createBookingDirectory = async (
  payload: { slug: string; name: string; description?: string | null; isActive?: boolean },
  caller: CallerContext,
): Promise<SafeBookingDirectory> => {
  assertSuperAdmin(caller);

  try {
    return await prisma.bookingDirectory.create({
      data: {
        slug: payload.slug,
        name: payload.name,
        description: payload.description ?? null,
        isActive: payload.isActive ?? true,
        createdById: caller.id,
        updatedById: caller.id,
      },
      include: bookingDirectoryInclude,
    });
  } catch (error) {
    return rethrowPrismaError(error, {
      P2002: {
        status: StatusCodes.CONFLICT,
        message: "A booking directory with this slug already exists.",
      },
    });
  }
};

const listBookingDirectories = async (caller: CallerContext): Promise<SafeBookingDirectory[]> => {
  assertSuperAdmin(caller);
  return prisma.bookingDirectory.findMany({
    orderBy: { createdAt: "asc" },
    include: bookingDirectoryInclude,
  });
};

const getBookingDirectory = async (directoryId: string, caller: CallerContext): Promise<SafeBookingDirectory> => {
  assertSuperAdmin(caller);
  return loadOrThrow(directoryId);
};

const updateBookingDirectory = async (
  directoryId: string,
  payload: { name?: string; description?: string | null; isActive?: boolean },
  caller: CallerContext,
): Promise<SafeBookingDirectory> => {
  assertSuperAdmin(caller);

  const data: Record<string, unknown> = { updatedById: caller.id };
  if (payload.name !== undefined) data.name = payload.name;
  if (payload.description !== undefined) data.description = payload.description;
  if (payload.isActive !== undefined) data.isActive = payload.isActive;

  try {
    return await prisma.bookingDirectory.update({
      where: { id: directoryId },
      data,
      include: bookingDirectoryInclude,
    });
  } catch (error) {
    return rethrowPrismaError(error, {
      P2025: { status: StatusCodes.NOT_FOUND, message: "Booking directory not found." },
    });
  }
};

const deleteBookingDirectory = async (directoryId: string, caller: CallerContext): Promise<void> => {
  assertSuperAdmin(caller);
  try {
    await prisma.bookingDirectory.delete({ where: { id: directoryId } });
  } catch (error) {
    rethrowPrismaError(error, {
      P2025: { status: StatusCodes.NOT_FOUND, message: "Booking directory not found." },
    });
  }
};

const addSection = async (
  directoryId: string,
  payload: { eventTypeId: string; sortOrder?: number },
  caller: CallerContext,
): Promise<SafeBookingDirectory> => {
  assertSuperAdmin(caller);

  const eventType = await prisma.eventType.findUnique({ where: { id: payload.eventTypeId } });
  if (!eventType) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Event type not found.");
  }
  if (!eventType.isActive) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Selected event type is inactive.");
  }

  try {
    const sectionData: Prisma.BookingDirectorySectionUncheckedCreateInput = {
      bookingDirectoryId: directoryId,
      eventTypeId: payload.eventTypeId,
      sortOrder: payload.sortOrder ?? 0,
    };
    await prisma.bookingDirectorySection.create({ data: sectionData });
  } catch (error) {
    rethrowPrismaError(error, {
      P2002: {
        status: StatusCodes.CONFLICT,
        message: "This event type is already in the booking directory.",
      },
      P2003: { status: StatusCodes.NOT_FOUND, message: "Booking directory not found." },
    });
  }

  return loadOrThrow(directoryId);
};

const removeSection = async (
  directoryId: string,
  sectionId: string,
  caller: CallerContext,
): Promise<SafeBookingDirectory> => {
  assertSuperAdmin(caller);

  const section = await prisma.bookingDirectorySection.findUnique({ where: { id: sectionId } });
  if (!section || section.bookingDirectoryId !== directoryId) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Section not found in this booking directory.");
  }

  await prisma.bookingDirectorySection.delete({ where: { id: sectionId } });
  return loadOrThrow(directoryId);
};

const addTeamToSection = async (
  directoryId: string,
  sectionId: string,
  payload: { teamId: string; sortOrder?: number },
  caller: CallerContext,
): Promise<SafeBookingDirectory> => {
  assertSuperAdmin(caller);

  const section = await prisma.bookingDirectorySection.findUnique({ where: { id: sectionId } });
  if (!section || section.bookingDirectoryId !== directoryId) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Section not found in this booking directory.");
  }

  const team = await prisma.team.findFirst({ where: { id: payload.teamId, deletedAt: null } });
  if (!team) throw new ErrorHandler(StatusCodes.NOT_FOUND, "Team not found.");

  try {
    await prisma.bookingDirectoryTeam.create({
      data: {
        sectionId,
        teamId: payload.teamId,
        sortOrder: payload.sortOrder ?? 0,
      },
    });
  } catch (error) {
    rethrowPrismaError(error, {
      P2002: { status: StatusCodes.CONFLICT, message: "This team is already in this section." },
    });
  }

  return loadOrThrow(directoryId);
};

const removeTeamFromSection = async (
  directoryId: string,
  sectionId: string,
  teamId: string,
  caller: CallerContext,
): Promise<SafeBookingDirectory> => {
  assertSuperAdmin(caller);

  const section = await prisma.bookingDirectorySection.findUnique({ where: { id: sectionId } });
  if (!section || section.bookingDirectoryId !== directoryId) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Section not found in this booking directory.");
  }

  const entry = await prisma.bookingDirectoryTeam.findUnique({
    where: { sectionId_teamId: { sectionId, teamId } },
  });
  if (!entry) throw new ErrorHandler(StatusCodes.NOT_FOUND, "Team not found in this section.");

  await prisma.bookingDirectoryTeam.delete({ where: { sectionId_teamId: { sectionId, teamId } } });
  return loadOrThrow(directoryId);
};

export {
  createBookingDirectory,
  listBookingDirectories,
  getBookingDirectory,
  updateBookingDirectory,
  deleteBookingDirectory,
  addSection,
  removeSection,
  addTeamToSection,
  removeTeamFromSection,
};
