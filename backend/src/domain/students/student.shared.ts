import { Prisma } from "@prisma/client";

export const latestBookingInclude = Prisma.validator<Prisma.BookingInclude>()({
  team: {
    select: {
      id: true,
      name: true,
    },
  },
  event: {
    select: {
      id: true,
      name: true,
      publicBookingSlug: true,
    },
  },
  coach: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatarUrl: true,
    },
  },
});

export type LatestBookingRecord = Prisma.BookingGetPayload<{
  include: typeof latestBookingInclude;
}>;

export const studentSummaryInclude = Prisma.validator<Prisma.StudentInclude>()({
  bookings: {
    orderBy: { startTime: "desc" },
    take: 1,
    include: latestBookingInclude,
  },
  _count: {
    select: {
      bookings: true,
    },
  },
});

export type StudentSummaryRecord = Prisma.StudentGetPayload<{
  include: typeof studentSummaryInclude;
}>;

export const sessionLogBookingInclude = {
  event: { select: { name: true, interactionType: true } },
  coach: { select: { firstName: true, lastName: true } },
  sessionAttendance: { select: { attended: true } },
  sessionLog: {
    include: {
      loggedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  scheduleSlot: {
    include: {
      sessionLog: {
        include: {
          loggedBy: { select: { id: true, firstName: true, lastName: true } },
          attendance: {
            where: {},
            select: { bookingId: true, attended: true },
          },
        },
      },
    },
  },
} satisfies Prisma.BookingInclude;

export type SessionLogBookingRecord = Prisma.BookingGetPayload<{
  include: typeof sessionLogBookingInclude;
}>;

export const communicationLogWithSenderInclude = {
  sentBy: { select: { firstName: true, lastName: true } },
} satisfies Prisma.StudentCommunicationLogInclude;
