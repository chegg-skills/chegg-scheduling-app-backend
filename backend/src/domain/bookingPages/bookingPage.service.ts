import { StatusCodes } from "http-status-codes";
import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { rethrowPrismaError } from "../../shared/error/prismaError";
import type { CallerContext } from "../../shared/utils/userUtils";

const assertSuperAdmin = (caller: CallerContext): void => {
  if (caller.role !== UserRole.SUPER_ADMIN) {
    throw new ErrorHandler(StatusCodes.FORBIDDEN, "Only super admins can manage booking pages.");
  }
};

const bookingPageInclude = Prisma.validator<Prisma.BookingPageInclude>()({
  sections: {
    orderBy: { sortOrder: "asc" },
    include: {
      sessionType: true,
      teams: {
        orderBy: { sortOrder: "asc" },
        include: { team: { select: { id: true, name: true, publicBookingSlug: true, isActive: true } } },
      },
    },
  },
});

type SafeBookingPage = Prisma.BookingPageGetPayload<{ include: typeof bookingPageInclude }>;

const loadOrThrow = async (pageId: string): Promise<SafeBookingPage> => {
  const page = await prisma.bookingPage.findUnique({
    where: { id: pageId },
    include: bookingPageInclude,
  });
  if (!page) throw new ErrorHandler(StatusCodes.NOT_FOUND, "Booking page not found.");
  return page;
};

const createBookingPage = async (
  payload: { slug: string; name: string; description?: string | null; isActive?: boolean },
  caller: CallerContext,
): Promise<SafeBookingPage> => {
  assertSuperAdmin(caller);

  try {
    return await prisma.bookingPage.create({
      data: {
        slug: payload.slug,
        name: payload.name,
        description: payload.description ?? null,
        isActive: payload.isActive ?? true,
        createdById: caller.id,
        updatedById: caller.id,
      },
      include: bookingPageInclude,
    });
  } catch (error) {
    return rethrowPrismaError(error, {
      P2002: { status: StatusCodes.CONFLICT, message: "A booking page with this slug already exists." },
    });
  }
};

const listBookingPages = async (caller: CallerContext): Promise<SafeBookingPage[]> => {
  assertSuperAdmin(caller);
  return prisma.bookingPage.findMany({
    orderBy: { createdAt: "asc" },
    include: bookingPageInclude,
  });
};

const getBookingPage = async (pageId: string, caller: CallerContext): Promise<SafeBookingPage> => {
  assertSuperAdmin(caller);
  return loadOrThrow(pageId);
};

const updateBookingPage = async (
  pageId: string,
  payload: { name?: string; description?: string | null; isActive?: boolean },
  caller: CallerContext,
): Promise<SafeBookingPage> => {
  assertSuperAdmin(caller);

  const data: Record<string, unknown> = { updatedById: caller.id };
  if (payload.name !== undefined) data.name = payload.name;
  if (payload.description !== undefined) data.description = payload.description;
  if (payload.isActive !== undefined) data.isActive = payload.isActive;

  try {
    return await prisma.bookingPage.update({
      where: { id: pageId },
      data,
      include: bookingPageInclude,
    });
  } catch (error) {
    return rethrowPrismaError(error, {
      P2025: { status: StatusCodes.NOT_FOUND, message: "Booking page not found." },
    });
  }
};

const deleteBookingPage = async (pageId: string, caller: CallerContext): Promise<void> => {
  assertSuperAdmin(caller);
  try {
    await prisma.bookingPage.delete({ where: { id: pageId } });
  } catch (error) {
    rethrowPrismaError(error, {
      P2025: { status: StatusCodes.NOT_FOUND, message: "Booking page not found." },
    });
  }
};

const addSection = async (
  pageId: string,
  payload: { sessionTypeId: string; sortOrder?: number },
  caller: CallerContext,
): Promise<SafeBookingPage> => {
  assertSuperAdmin(caller);

  const sessionType = await prisma.sessionType.findUnique({ where: { id: payload.sessionTypeId } });
  if (!sessionType) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Session type not found.");
  }

  try {
    await prisma.bookingPageSection.create({
      data: {
        bookingPageId: pageId,
        sessionTypeId: payload.sessionTypeId,
        sortOrder: payload.sortOrder ?? 0,
      },
    });
  } catch (error) {
    rethrowPrismaError(error, {
      P2002: { status: StatusCodes.CONFLICT, message: "This session type is already on the booking page." },
      P2003: { status: StatusCodes.NOT_FOUND, message: "Booking page not found." },
    });
  }

  return loadOrThrow(pageId);
};

const removeSection = async (
  pageId: string,
  sectionId: string,
  caller: CallerContext,
): Promise<SafeBookingPage> => {
  assertSuperAdmin(caller);

  const section = await prisma.bookingPageSection.findUnique({ where: { id: sectionId } });
  if (!section || section.bookingPageId !== pageId) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Section not found on this booking page.");
  }

  await prisma.bookingPageSection.delete({ where: { id: sectionId } });
  return loadOrThrow(pageId);
};

const addTeamToSection = async (
  pageId: string,
  sectionId: string,
  payload: { teamId: string; sortOrder?: number },
  caller: CallerContext,
): Promise<SafeBookingPage> => {
  assertSuperAdmin(caller);

  const section = await prisma.bookingPageSection.findUnique({ where: { id: sectionId } });
  if (!section || section.bookingPageId !== pageId) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Section not found on this booking page.");
  }

  const team = await prisma.team.findUnique({ where: { id: payload.teamId } });
  if (!team) throw new ErrorHandler(StatusCodes.NOT_FOUND, "Team not found.");

  try {
    await prisma.bookingPageTeam.create({
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

  return loadOrThrow(pageId);
};

const removeTeamFromSection = async (
  pageId: string,
  sectionId: string,
  teamId: string,
  caller: CallerContext,
): Promise<SafeBookingPage> => {
  assertSuperAdmin(caller);

  const section = await prisma.bookingPageSection.findUnique({ where: { id: sectionId } });
  if (!section || section.bookingPageId !== pageId) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Section not found on this booking page.");
  }

  const entry = await prisma.bookingPageTeam.findUnique({
    where: { sectionId_teamId: { sectionId, teamId } },
  });
  if (!entry) throw new ErrorHandler(StatusCodes.NOT_FOUND, "Team not found in this section.");

  await prisma.bookingPageTeam.delete({ where: { sectionId_teamId: { sectionId, teamId } } });
  return loadOrThrow(pageId);
};

export {
  createBookingPage,
  listBookingPages,
  getBookingPage,
  updateBookingPage,
  deleteBookingPage,
  addSection,
  removeSection,
  addTeamToSection,
  removeTeamFromSection,
};
