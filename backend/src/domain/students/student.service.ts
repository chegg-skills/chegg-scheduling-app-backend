import { Prisma, UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { resolvePagination } from "../../shared/utils/pagination";
import type { CallerContext } from "../../shared/utils/userUtils";
import { bookingInclude, type SafeBooking } from "../bookings/booking.service";

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

const latestBookingInclude = Prisma.validator<Prisma.BookingInclude>()({
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

type LatestBookingRecord = Prisma.BookingGetPayload<{
  include: typeof latestBookingInclude;
}>;

const studentSummaryInclude = Prisma.validator<Prisma.StudentInclude>()({
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

type StudentSummaryRecord = Prisma.StudentGetPayload<{
  include: typeof studentSummaryInclude;
}>;

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
  };
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

  const [students, total] = await prisma.$transaction([
    prisma.student.findMany({
      where,
      include: studentSummaryInclude,
      orderBy: [{ lastBookedAt: "desc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.student.count({ where }),
  ]);

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

  const student = await prisma.student.findFirst({
    where: {
      id: normalizedStudentId,
      ...accessWhere,
    },
    include: studentSummaryInclude,
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

  const [bookings, total] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: { startTime: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.booking.count({ where }),
  ]);

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

export { listStudents, readStudent, listStudentBookings };
