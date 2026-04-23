import { BookingStatus, Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { normalizeEmail } from "../../shared/utils/userUtils";

export type CreateBookingInput = {
  studentName: string;
  studentEmail: string;
  teamId: string;
  eventId: string;
  startTime: string | Date;
  timezone?: string;
  notes?: string;
  specificQuestion?: string;
  triedSolutions?: string;
  usedResources?: string;
  sessionObjectives?: string;
  preferredCoachId?: string;
};

export type RescheduleBookingInput = {
  startTime: string | Date;
  timezone?: string;
  token?: string;
};

export type UpdateBookingStatusInput = {
  status: BookingStatus;
};

export type ListBookingsFilters = {
  teamId?: string;
  eventId?: string;
  coachUserId?: string;
  status?: BookingStatus;
  search?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  page?: number;
  limit?: number;
};

export const bookingInclude = Prisma.validator<Prisma.BookingInclude>()({
  student: {
    select: {
      id: true,
      fullName: true,
      email: true,
      firstBookedAt: true,
      lastBookedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  team: true,
  event: {
    include: {
      coaches: {
        include: {
          coachUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              email: true,
            },
          },
        },
      },
    },
  },
  coach: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      timezone: true,
      avatarUrl: true,
      zoomIsvLink: true,
    },
  },
});

export type SafeBooking = Prisma.BookingGetPayload<{
  include: typeof bookingInclude;
}>;

export const bookableEventInclude = Prisma.validator<Prisma.EventInclude>()({
  routingState: true,
  coaches: {
    where: { isActive: true },
    orderBy: { coachOrder: "asc" },
    include: {
      coachUser: {
        select: {
          zoomIsvLink: true,
        },
      },
    },
  },
  weeklyAvailability: true,
  _count: {
    select: {
      bookings: {
        where: { status: { not: "CANCELLED" } },
      },
    },
  },
});

export type BookableEvent = Prisma.EventGetPayload<{ include: typeof bookableEventInclude }>;

export type BookingSchedulingContext = Pick<
  BookableEvent,
  | "id"
  | "interactionType"
  | "bookingMode"
  | "allowedWeekdays"
  | "minimumNoticeMinutes"
  | "minParticipantCount"
  | "maxParticipantCount"
  | "minCoachCount"
  | "maxCoachCount"
  | "sessionLeadershipStrategy"
  | "fixedLeadCoachId"
  | "targetCoHostCount"
  | "weeklyAvailability"
>;

export const normalizeStudentName = (studentName: string): string => {
  const normalizedName = studentName?.trim();

  if (!normalizedName) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "studentName is required.");
  }

  return normalizedName;
};

export const normalizeStudentEmailAddress = (studentEmail: string): string => {
  const normalizedStudentEmail = normalizeEmail(studentEmail ?? "");

  if (!normalizedStudentEmail) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "studentEmail is required.");
  }

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedStudentEmail);
  if (!isValidEmail) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "A valid studentEmail is required.");
  }

  return normalizedStudentEmail;
};

export const parseBookingStartTime = (startTime: string | Date): Date => {
  const start = new Date(startTime);

  if (Number.isNaN(start.getTime())) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Invalid startTime provided.");
  }

  const gracePeriodMs = 5 * 60 * 1000;
  if (start.getTime() < Date.now() - gracePeriodMs) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "Cannot book a session that has already finished or started too long ago.",
    );
  }

  return start;
};

export const buildSchedulingContext = (event: BookableEvent): BookingSchedulingContext => ({
  id: event.id,
  interactionType: event.interactionType,
  bookingMode: event.bookingMode,
  allowedWeekdays: event.allowedWeekdays,
  minimumNoticeMinutes: event.minimumNoticeMinutes,
  minParticipantCount: event.minParticipantCount,
  maxParticipantCount: event.maxParticipantCount,
  minCoachCount: event.minCoachCount,
  maxCoachCount: event.maxCoachCount,
  sessionLeadershipStrategy: event.sessionLeadershipStrategy,
  fixedLeadCoachId: event.fixedLeadCoachId,
  targetCoHostCount: event.targetCoHostCount,
  weeklyAvailability: event.weeklyAvailability,
});

export const buildBookingListWhere = (filters: ListBookingsFilters): Prisma.BookingWhereInput => {
  const normalizedSearch = filters.search?.trim();
  const hasSearch = Boolean(normalizedSearch);

  const where: Prisma.BookingWhereInput = {
    AND: [] as Prisma.BookingWhereInput[],
  };

  const and = where.AND as Prisma.BookingWhereInput[];

  if (filters.teamId) and.push({ teamId: filters.teamId });
  if (filters.eventId) and.push({ eventId: filters.eventId });
  if (filters.status) and.push({ status: filters.status });

  if (filters.coachUserId) {
    and.push({
      OR: [{ coachUserId: filters.coachUserId }, { coCoachUserIds: { has: filters.coachUserId } }],
    });
  }

  if (filters.startDate || filters.endDate) {
    and.push({
      startTime: {
        gte: filters.startDate ? new Date(filters.startDate) : undefined,
        lte: filters.endDate ? new Date(filters.endDate) : undefined,
      },
    });
  }

  if (hasSearch) {
    and.push({
      OR: [
        {
          studentName: {
            contains: normalizedSearch,
            mode: "insensitive",
          },
        },
        {
          studentEmail: {
            contains: normalizedSearch,
            mode: "insensitive",
          },
        },
        {
          id: {
            contains: normalizedSearch,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  return where;
};
