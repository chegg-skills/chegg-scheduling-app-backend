import { CommunicationStatus, type Prisma, type StudentCommunicationLog } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import type { DbClient } from "../../shared/db/repository";
import { bookingInclude, type SafeBooking } from "../bookings/booking.service";
import {
  communicationLogWithSenderInclude,
  sessionLogBookingInclude,
  studentSummaryInclude,
  type SessionLogBookingRecord,
  type StudentSummaryRecord,
} from "./student.shared";

const communicationListInclude = {
  sentBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.StudentCommunicationLogInclude;

export type CommunicationLogWithSender = Prisma.StudentCommunicationLogGetPayload<{
  include: typeof communicationLogWithSenderInclude;
}>;

export type CommunicationLogWithSenderDetail = Prisma.StudentCommunicationLogGetPayload<{
  include: typeof communicationListInclude;
}>;

export interface StudentRepository {
  findManyWithCount(
    params: { where: Prisma.StudentWhereInput; skip: number; take: number },
    tx?: DbClient,
  ): Promise<[StudentSummaryRecord[], number]>;
  findFirstSummary(
    where: Prisma.StudentWhereInput,
    tx?: DbClient,
  ): Promise<StudentSummaryRecord | null>;
  findBookingsWithCount(
    params: { where: Prisma.BookingWhereInput; skip: number; take: number },
    tx?: DbClient,
  ): Promise<[SafeBooking[], number]>;
  findBookingsWithSessionLogs(
    where: Prisma.BookingWhereInput,
    tx?: DbClient,
  ): Promise<SessionLogBookingRecord[]>;

  createCommunicationLog(
    data: {
      studentId: string;
      subject: string;
      body: string;
      status: CommunicationStatus;
      sentById: string;
    },
    tx?: DbClient,
  ): Promise<CommunicationLogWithSender>;
  findCommunicationLogs(
    studentId: string,
    tx?: DbClient,
  ): Promise<CommunicationLogWithSenderDetail[]>;
  findCommunicationLogById(id: string, tx?: DbClient): Promise<StudentCommunicationLog | null>;
  resetCommunicationLogToPending(id: string, tx?: DbClient): Promise<CommunicationLogWithSender>;
}

export const createStudentRepo = (db: DbClient = prisma): StudentRepository => ({
  findManyWithCount: ({ where, skip, take }, tx) => {
    const client = tx ?? db;
    const queries = [
      client.student.findMany({
        where,
        include: studentSummaryInclude,
        orderBy: [{ lastBookedAt: "desc" }, { createdAt: "desc" }],
        skip,
        take,
      }),
      client.student.count({ where }),
    ] as const;
    // Root client: one batched transaction (as before). A transaction client is already atomic.
    return "$transaction" in client ? client.$transaction([...queries]) : Promise.all(queries);
  },

  findFirstSummary: (where, tx) =>
    (tx ?? db).student.findFirst({ where, include: studentSummaryInclude }),

  findBookingsWithCount: ({ where, skip, take }, tx) => {
    const client = tx ?? db;
    const queries = [
      client.booking.findMany({
        where,
        include: bookingInclude,
        orderBy: { startTime: "desc" },
        skip,
        take,
      }),
      client.booking.count({ where }),
    ] as const;
    return "$transaction" in client ? client.$transaction([...queries]) : Promise.all(queries);
  },

  findBookingsWithSessionLogs: (where, tx) =>
    (tx ?? db).booking.findMany({
      where,
      orderBy: { startTime: "desc" },
      include: sessionLogBookingInclude,
    }),

  createCommunicationLog: (data, tx) =>
    (tx ?? db).studentCommunicationLog.create({
      data,
      include: communicationLogWithSenderInclude,
    }),

  findCommunicationLogs: (studentId, tx) =>
    (tx ?? db).studentCommunicationLog.findMany({
      where: { studentId },
      include: communicationListInclude,
      orderBy: { sentAt: "desc" },
    }),

  findCommunicationLogById: (id, tx) =>
    (tx ?? db).studentCommunicationLog.findUnique({ where: { id } }),

  resetCommunicationLogToPending: (id, tx) =>
    (tx ?? db).studentCommunicationLog.update({
      where: { id },
      data: { status: CommunicationStatus.PENDING, errorMessage: null },
      include: communicationLogWithSenderInclude,
    }),
});
