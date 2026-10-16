import { Prisma, UserRole, CommunicationStatus } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { resolvePagination } from "../../shared/utils/pagination";
import type { CallerContext } from "../../shared/utils/userUtils";
import type { SafeBooking } from "../bookings/booking.service";
import { htmlToPlainText, sanitizeHtml } from "../../shared/utils/htmlSanitizer";
import { publishNotificationSafely } from "../../shared/notifications/notification.publisher";
import type { StudentRepository } from "./student.repository";
import type { LatestBookingRecord, StudentSummaryRecord } from "./student.shared";

type ListStudentsOptions = {
  page?: number;
  pageSize?: number;
  search?: string;
  teamId?: string;
  eventId?: string;
  coachUserId?: string;
};

type ListStudentBookingsOptions = {
  page?: number;
  pageSize?: number;
};

const normalizeStudentId = (studentId: string): string => {
  const normalizedStudentId = studentId?.trim();

  if (!normalizedStudentId) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "studentId is required.");
  }

  return normalizedStudentId;
};

const buildTeamAdminBookingScope = (callerId: string): Prisma.BookingWhereInput => ({
  team: {
    OR: [
      { teamLeadId: callerId },
      {
        members: {
          some: {
            userId: callerId,
            isActive: true,
          },
        },
      },
    ],
  },
});

const buildBookingAccessWhere = (caller: CallerContext): Prisma.BookingWhereInput => {
  switch (caller.role) {
    case UserRole.SUPER_ADMIN:
      return {};
    case UserRole.TEAM_ADMIN:
      return buildTeamAdminBookingScope(caller.id);
    case UserRole.COACH:
      return { coachUserId: caller.id };
    default:
      return { id: "__forbidden__" };
  }
};

const buildStudentWhere = (
  caller: CallerContext,
  options: ListStudentsOptions = {},
): Prisma.StudentWhereInput => {
  const conditions: Prisma.StudentWhereInput[] = [];
  const accessWhere = buildBookingAccessWhere(caller);

  if (Object.keys(accessWhere).length > 0) {
    conditions.push({
      bookings: {
        some: accessWhere,
      },
    });
  }

  const normalizedSearch = options.search?.trim();
  if (normalizedSearch) {
    conditions.push({
      OR: [
        {
          fullName: {
            contains: normalizedSearch,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: normalizedSearch,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  const bookingFilters: Prisma.BookingWhereInput = {};
  if (options.teamId) {
    bookingFilters.teamId = options.teamId;
  }
  if (options.eventId) {
    bookingFilters.eventId = options.eventId;
  }
  if (options.coachUserId && caller.role !== UserRole.COACH) {
    bookingFilters.coachUserId = options.coachUserId;
  }

  if (Object.keys(bookingFilters).length > 0) {
    conditions.push({
      bookings: {
        some: bookingFilters,
      },
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
};

const mapLatestBookingSummary = (
  booking?: LatestBookingRecord,
): {
  id: string;
  startTime: Date;
  endTime: Date;
  status: string;
  team: { id: string; name: string };
  event: { id: string; name: string; publicBookingSlug: string };
  coach: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  } | null;
} | null => {
  if (!booking) {
    return null;
  }

  return {
    id: booking.id,
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status,
    team: booking.team,
    event: booking.event,
    coach: booking.coach,
  };
};

const mapStudentSummary = (student: StudentSummaryRecord) => ({
  id: student.id,
  fullName: student.fullName,
  email: student.email,
  firstBookedAt: student.firstBookedAt,
  lastBookedAt: student.lastBookedAt,
  createdAt: student.createdAt,
  updatedAt: student.updatedAt,
  bookingCount: student._count.bookings,
  latestBooking: mapLatestBookingSummary(student.bookings[0]),
});

export type StudentSessionLogEntry = {
  logId: string;
  bookingId: string;
  sessionDate: Date;
  eventName: string;
  interactionType: string;
  coachName: string;
  attended: boolean | null;
  topicsDiscussed: string | null;
  summary: string | null;
  coachNotes: string | null;
  loggedBy: { id: string; firstName: string; lastName: string } | null;
  isGroupSession: boolean;
  updatedAt: Date;
};

export const createStudentService = (studentRepo: StudentRepository) => {
  const listStudents = async (
    caller: CallerContext,
    options: ListStudentsOptions = {},
  ): Promise<{
    students: Array<ReturnType<typeof mapStudentSummary>>;
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> => {
    const { page, pageSize, skip } = resolvePagination(options, {
      defaultPageSize: 25,
    });
    const where = buildStudentWhere(caller, options);

    const [students, total] = await studentRepo.findManyWithCount({ where, skip, take: pageSize });

    return {
      students: students.map(mapStudentSummary),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  };

  const readStudent = async (
    studentId: string,
    caller: CallerContext,
  ): Promise<ReturnType<typeof mapStudentSummary>> => {
    const normalizedStudentId = normalizeStudentId(studentId);
    const accessWhere = buildStudentWhere(caller);

    const student = await studentRepo.findFirstSummary({
      id: normalizedStudentId,
      ...accessWhere,
    });

    if (!student) {
      throw new ErrorHandler(StatusCodes.NOT_FOUND, "Student not found.");
    }

    return mapStudentSummary(student);
  };

  const listStudentBookings = async (
    studentId: string,
    caller: CallerContext,
    options: ListStudentBookingsOptions = {},
  ): Promise<{
    bookings: SafeBooking[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> => {
    const normalizedStudentId = normalizeStudentId(studentId);
    await readStudent(normalizedStudentId, caller);

    const { page, pageSize, skip } = resolvePagination(options, {
      defaultPageSize: 25,
    });
    const accessWhere = buildBookingAccessWhere(caller);

    const where: Prisma.BookingWhereInput = {
      studentId: normalizedStudentId,
      ...accessWhere,
    };

    const [bookings, total] = await studentRepo.findBookingsWithCount({
      where,
      skip,
      take: pageSize,
    });

    return {
      bookings,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  };

  const listStudentSessionLogs = async (
    studentId: string,
    caller: CallerContext,
  ): Promise<StudentSessionLogEntry[]> => {
    const normalizedStudentId = normalizeStudentId(studentId);
    await readStudent(normalizedStudentId, caller);

    const accessWhere = buildBookingAccessWhere(caller);
    const where: Prisma.BookingWhereInput = {
      studentId: normalizedStudentId,
      ...accessWhere,
      OR: [{ sessionLog: { isNot: null } }, { scheduleSlot: { sessionLog: { isNot: null } } }],
    };

    const bookings = await studentRepo.findBookingsWithSessionLogs(where);

    const canSeePrivateNotes =
      caller.role === UserRole.SUPER_ADMIN || caller.role === UserRole.TEAM_ADMIN;

    const entries: StudentSessionLogEntry[] = [];

    for (const booking of bookings) {
      const directLog = booking.sessionLog;
      const slotLog = booking.scheduleSlot?.sessionLog;
      const log = directLog ?? slotLog;
      if (!log) continue;

      const isGroupSession = !!directLog ? false : true;
      let attended: boolean | null = null;

      if (isGroupSession) {
        const match = slotLog?.attendance.find((a) => a.bookingId === booking.id);
        attended = match?.attended ?? null;
      } else {
        attended = booking.sessionAttendance?.attended ?? null;
      }

      entries.push({
        logId: log.id,
        bookingId: booking.id,
        sessionDate: booking.startTime,
        eventName: booking.event?.name ?? "",
        interactionType: booking.event?.interactionType ?? "",
        coachName: booking.coach
          ? `${booking.coach.firstName} ${booking.coach.lastName}`.trim()
          : "",
        attended,
        topicsDiscussed: log.topicsDiscussed ?? null,
        summary: log.summary ?? null,
        coachNotes: canSeePrivateNotes ? (log.coachNotes ?? null) : null,
        loggedBy: log.loggedBy
          ? {
              id: log.loggedBy.id,
              firstName: log.loggedBy.firstName,
              lastName: log.loggedBy.lastName,
            }
          : null,
        isGroupSession,
        updatedAt: log.updatedAt,
      });
    }

    return entries;
  };

  const sendStudentEmail = async (
    studentId: string,
    subject: string,
    body: string,
    caller: CallerContext,
  ) => {
    const student = await readStudent(studentId, caller);
    const sanitizedBody = sanitizeHtml(body);

    // Include sentBy so we avoid a separate N+1 query for the sender's name
    const log = await studentRepo.createCommunicationLog({
      studentId,
      subject: subject.trim(),
      body: sanitizedBody,
      status: CommunicationStatus.PENDING,
      sentById: caller.id,
    });

    const senderName = `${log.sentBy.firstName} ${log.sentBy.lastName}`.trim() || "Coach";
    const textBody = htmlToPlainText(sanitizedBody);

    await publishNotificationSafely({
      type: "STUDENT_CUSTOM_EMAIL",
      recipients: student.email,
      notificationKey: log.id,
      userId: caller.id,
      variables: {
        subject: log.subject,
        htmlBody: log.body,
        textBody,
        studentName: student.fullName,
        senderName,
      },
    });

    return log;
  };

  const listStudentCommunications = async (studentId: string, caller: CallerContext) => {
    await readStudent(studentId, caller);

    return studentRepo.findCommunicationLogs(studentId);
  };

  const retryEmailDispatch = async (logId: string, caller: CallerContext) => {
    const originalLog = await studentRepo.findCommunicationLogById(logId);

    if (!originalLog) {
      throw new ErrorHandler(StatusCodes.NOT_FOUND, "Communication log not found.");
    }

    const student = await readStudent(originalLog.studentId, caller);

    if (caller.role === UserRole.COACH && originalLog.sentById !== caller.id) {
      throw new ErrorHandler(StatusCodes.FORBIDDEN, "You can only retry your own communications.");
    }

    if (originalLog.status !== CommunicationStatus.FAILED) {
      throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Only failed communications can be retried.");
    }

    // Reset the existing log in-place: FAILED → PENDING
    // This keeps exactly one card per email in the Communications tab.
    // The same logId is reused as the notificationKey so the notification-service
    // upserts the same notification record, and the feedback consumer updates
    // this same log on delivery.
    const updatedLog = await studentRepo.resetCommunicationLogToPending(logId);

    const senderName =
      `${updatedLog.sentBy.firstName} ${updatedLog.sentBy.lastName}`.trim() || "Coach";
    const textBody = htmlToPlainText(updatedLog.body);

    await publishNotificationSafely({
      type: "STUDENT_CUSTOM_EMAIL",
      recipients: student.email,
      notificationKey: logId, // reuse the same key → upserts the existing notification record
      userId: originalLog.sentById,
      variables: {
        subject: updatedLog.subject,
        htmlBody: updatedLog.body,
        textBody,
        studentName: student.fullName,
        senderName,
      },
    });

    return updatedLog;
  };

  return {
    listStudents,
    readStudent,
    listStudentBookings,
    listStudentSessionLogs,
    sendStudentEmail,
    listStudentCommunications,
    retryEmailDispatch,
  };
};

export type StudentService = ReturnType<typeof createStudentService>;
