import { BookingStatus, MeetingLinkSource, Prisma, PrismaClient } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { resolveApiBaseUrl } from "../../shared/notifications/notification.publisher";

export const assertRescheduleTokenValid = (booking: {
  status: BookingStatus;
  startTime: Date;
  event: { durationSeconds: number };
}): void => {
  if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CONFIRMED) {
    throw new ErrorHandler(StatusCodes.FORBIDDEN, "This booking link is no longer valid.");
  }
  const sessionEndMs = new Date(booking.startTime).getTime() + booking.event.durationSeconds * 1000;
  const gracePeriodMs = 2 * 60 * 60 * 1000; // 2 hours after session end
  if (Date.now() > sessionEndMs + gracePeriodMs) {
    throw new ErrorHandler(
      StatusCodes.FORBIDDEN,
      "This session has ended. To book a new session, visit the team's booking page.",
    );
  }
};

export const assertCancelTokenValid = (booking: {
  status: BookingStatus;
  startTime: Date;
}): void => {
  if (booking.status === BookingStatus.CANCELLED) {
    throw new ErrorHandler(StatusCodes.CONFLICT, "This session has already been cancelled.");
  }
  if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CONFIRMED) {
    throw new ErrorHandler(StatusCodes.FORBIDDEN, "This booking link is no longer valid.");
  }
  if (Date.now() >= new Date(booking.startTime).getTime()) {
    throw new ErrorHandler(
      StatusCodes.FORBIDDEN,
      "This session has already started and cannot be cancelled via this link.",
    );
  }
};
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
  customAnswers?: string[];
};

export type RescheduleBookingInput = {
  startTime: string | Date;
  timezone?: string;
  token?: string;
};

export type UpdateBookingStatusInput = {
  status: BookingStatus;
  cancellationReason?: string;
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
  /** When set, restricts results to teams where this user is lead or active member. */
  teamAdminCallerId?: string;
};

const bookingTeamSelect = Prisma.validator<Prisma.TeamSelect>()({
  id: true,
  name: true,
  publicBookingSlug: true,
  description: true,
  isActive: true,
});

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
  team: { select: bookingTeamSelect },
  event: {
    include: {
      eventType: true,
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
  scheduleSlot: {
    include: {
      assignedCoach: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, zoomIsvLink: true },
      },
      bookings: {
        include: {
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
        },
      },
    },
  },
});

export type SafeBooking = Prisma.BookingGetPayload<{
  include: typeof bookingInclude;
}>;

const sessionLogDetailInclude = {
  include: {
    loggedBy: {
      select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
    },
    attendance: true,
  },
} as const;

export const bookingDetailInclude = Prisma.validator<Prisma.BookingInclude>()({
  ...bookingInclude,
  sessionLog: sessionLogDetailInclude,
  scheduleSlot: {
    include: {
      assignedCoach: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, zoomIsvLink: true },
      },
      sessionLog: sessionLogDetailInclude,
      bookings: {
        include: {
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
        },
      },
    },
  },
});

export type DetailedBooking = Prisma.BookingGetPayload<{
  include: typeof bookingDetailInclude;
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
  | "minimumNoticeMinutes"
  | "maxParticipantCount"
  | "sessionLeadershipStrategy"
  | "fixedLeadCoachId"
  | "targetCoHostCount"
>;

/**
 * The single place a Booking.meetingJoinUrl value is ever constructed. Call this
 * — and only this — when creating a booking. The result is a stable, opaque
 * redirect (never a raw destination) that resolveBookingJoinRedirect
 * (public.service.ts) resolves dynamically at click time. Nothing downstream of
 * booking creation should ever compute or assign a different meetingJoinUrl —
 * BookingUpdateDataNoJoinUrl / BookingRecordUpdateDataNoJoinUrl below exist to
 * make that a compile error rather than a bug someone has to catch in review.
 */
export const buildStudentJoinUrl = (bookingId: string, sessionToken: string): string =>
  `${resolveApiBaseUrl()}/api/public/bookings/${bookingId}/join?t=${sessionToken}`;

/**
 * Resolves the actual meeting destination (a coach's Zoom link or the event's
 * shared location) for internal, non-student-facing use only — the redirect
 * resolver (public.service.ts) and the admin-facing booking detail display.
 * Never pass this value into a student-facing notification; students only ever
 * receive the opaque link from buildStudentJoinUrl / Booking.meetingJoinUrl.
 */
export const getMeetingJoinUrl = (
  event: { meetingLinkSource: MeetingLinkSource; locationValue: string | null },
  coachZoomLink: string | null | undefined,
): string | null => {
  if (event.meetingLinkSource === MeetingLinkSource.EVENT_LOCATION) {
    return event.locationValue || coachZoomLink || null;
  }
  return coachZoomLink || event.locationValue || null;
};

/**
 * Booking.meetingJoinUrl must only ever be set once, at creation, via
 * buildStudentJoinUrl. These types exclude it from any update payload so a
 * future cascade/update can't silently reintroduce a raw destination into a
 * student's confirmation email — passing meetingJoinUrl through these types is
 * a compile error, not a bug someone has to catch in review. The one deliberate
 * exception is src/scripts/ops/backfill-meeting-join-urls.ts, whose entire job
 * is repairing this exact field — it intentionally bypasses these types.
 */
export type BookingUpdateDataNoJoinUrl = Omit<
  Prisma.BookingUncheckedUpdateManyInput,
  "meetingJoinUrl"
>;

export type BookingRecordUpdateDataNoJoinUrl = Omit<
  Prisma.BookingUncheckedUpdateInput,
  "meetingJoinUrl"
>;

export const updateBookingsPreservingJoinUrl = (
  client: Prisma.TransactionClient | PrismaClient,
  where: Prisma.BookingWhereInput,
  data: BookingUpdateDataNoJoinUrl,
) => client.booking.updateMany({ where, data });

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
  minimumNoticeMinutes: event.minimumNoticeMinutes,
  maxParticipantCount: event.maxParticipantCount,
  sessionLeadershipStrategy: event.sessionLeadershipStrategy,
  fixedLeadCoachId: event.fixedLeadCoachId,
  targetCoHostCount: event.targetCoHostCount,
});

export const buildBookingListWhere = (filters: ListBookingsFilters): Prisma.BookingWhereInput => {
  const normalizedSearch = filters.search?.trim();
  const hasSearch = Boolean(normalizedSearch);

  const where: Prisma.BookingWhereInput = {
    AND: [] as Prisma.BookingWhereInput[],
  };

  const and = where.AND as Prisma.BookingWhereInput[];

  if (filters.teamId) and.push({ teamId: filters.teamId });

  // Scope to teams the caller leads or belongs to. Always applied alongside teamId (if provided)
  // so a TEAM_ADMIN cannot enumerate another team's bookings by supplying a foreign teamId.
  if (filters.teamAdminCallerId) {
    and.push({
      team: {
        OR: [
          { teamLeadId: filters.teamAdminCallerId },
          { members: { some: { userId: filters.teamAdminCallerId, isActive: true } } },
        ],
      },
    });
  }

  if (filters.eventId) and.push({ eventId: filters.eventId });
  if (filters.status) and.push({ status: filters.status });

  if (filters.coachUserId) {
    and.push({
      OR: [
        { coachUserId: filters.coachUserId },
        { coCoachUserIds: { has: filters.coachUserId } },
        { scheduleSlot: { assignedCoachId: filters.coachUserId } },
      ],
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
