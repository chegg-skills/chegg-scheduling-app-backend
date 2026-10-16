import type { BookingStatus, Prisma, User } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import type { DbClient } from "../../shared/db/repository";

const bookingReportInclude = {
  event: { include: { eventType: true } },
  coach: true,
  team: true,
  student: true,
} satisfies Prisma.BookingInclude;

export type BookingReportRow = Prisma.BookingGetPayload<{ include: typeof bookingReportInclude }>;

export type StudentReportRow = Prisma.StudentGetPayload<{
  include: { _count: { select: { bookings: true } } };
}>;

export type SlotSessionRow = {
  coachUserId: string | null;
  scheduleSlotId: string | null;
  status: BookingStatus;
};

export type IndividualSessionRow = {
  coachUserId: string | null;
  status: BookingStatus;
  _count: { id: number };
};

export interface ReportRepository {
  findBookings(where: Prisma.BookingWhereInput, tx?: DbClient): Promise<BookingReportRow[]>;
  findCoaches(where: Prisma.UserWhereInput, tx?: DbClient): Promise<User[]>;
  /** One row per distinct (coach, slot, status) = one session. */
  groupSlotSessions(where: Prisma.BookingWhereInput, tx?: DbClient): Promise<SlotSessionRow[]>;
  /** Slot-less bookings grouped by coach + status. */
  groupIndividualSessions(
    where: Prisma.BookingWhereInput,
    tx?: DbClient,
  ): Promise<IndividualSessionRow[]>;
  /** `bookingsCount` is `true` to count all of a student's bookings, or a filter to scope the count. */
  findStudents(
    where: Prisma.StudentWhereInput,
    bookingsCount: true | { where: Prisma.BookingWhereInput },
    tx?: DbClient,
  ): Promise<StudentReportRow[]>;
}

export const createReportRepo = (db: DbClient = prisma): ReportRepository => ({
  findBookings: (where, tx) =>
    (tx ?? db).booking.findMany({
      where,
      include: bookingReportInclude,
      orderBy: { startTime: "desc" },
    }),

  findCoaches: (where, tx) => (tx ?? db).user.findMany({ where }),

  groupSlotSessions: async (where, tx) => {
    const rows = await (tx ?? db).booking.groupBy({
      by: ["coachUserId", "scheduleSlotId", "status"],
      where,
    });
    return rows;
  },

  groupIndividualSessions: async (where, tx) => {
    const rows = await (tx ?? db).booking.groupBy({
      by: ["coachUserId", "status"],
      where,
      _count: { id: true },
    });
    return rows;
  },

  findStudents: (where, bookingsCount, tx) =>
    (tx ?? db).student.findMany({
      where,
      include: { _count: { select: { bookings: bookingsCount } } },
      orderBy: { lastBookedAt: "desc" },
    }),
});
