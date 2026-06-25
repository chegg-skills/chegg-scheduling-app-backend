import { BookingStatus, UserRole, Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import { convertToCSV } from "../../shared/utils/csv";
import { resolveTimeframe, buildDateFilter, requireAdmin } from "../stats/stats.shared";
import type { CallerContext } from "../../shared/utils/userUtils";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { StatusCodes } from "http-status-codes";

export const getBookingsReport = async (
  caller: CallerContext,
  timeframeRaw?: string,
): Promise<{ data: any[]; csv: string; filename: string }> => {
  requireAdmin(caller);
  const timeframe = resolveTimeframe(timeframeRaw);
  const dateFilter = buildDateFilter(timeframe);

  const where: Prisma.BookingWhereInput = {
    ...(dateFilter ? { startTime: dateFilter } : {}),
    ...(caller.role === UserRole.TEAM_ADMIN ? { team: { teamLeadId: caller.id } } : {}),
  };

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      event: {
        include: {
          eventType: true,
        },
      },
      coach: true,
      team: true,
      student: true,
    },
    orderBy: { startTime: "desc" },
  });

  const reportData = bookings.map((b) => ({
    "Booking ID": b.id,
    "Date/Time (UTC)": b.startTime,
    Status: b.status,
    Team: b.team.name,
    Event: b.event.name,
    "Event Type": b.event.eventType?.name ?? "",
    Coach: b.coach ? `${b.coach.firstName} ${b.coach.lastName}` : "",
    "Student Name": b.studentName,
    "Student Email": b.studentEmail,
    "Duration (Min)": Math.round((b.endTime.getTime() - b.startTime.getTime()) / 60000),
    Objectives: b.sessionObjectives || "",
    "Specific Question": b.specificQuestion || "",
    Notes: b.notes || "",
  }));

  const dateStr = new Date().toISOString().split("T")[0];
  return {
    data: reportData,
    csv: convertToCSV(reportData),
    filename: `bookings_report_${dateStr}.csv`,
  };
};

export const getPerformanceReport = async (
  caller: CallerContext,
  timeframeRaw?: string,
): Promise<{ data: any[]; csv: string; filename: string }> => {
  requireAdmin(caller);
  const timeframe = resolveTimeframe(timeframeRaw);
  const dateFilter = buildDateFilter(timeframe);

  const bookingWhere: Prisma.BookingWhereInput = {
    ...(dateFilter ? { startTime: dateFilter } : {}),
  };

  // Get all coaches
  const coaches = await prisma.user.findMany({
    where: {
      role: UserRole.COACH,
      isActive: true,
    },
  });

  const reportData = await Promise.all(
    coaches.map(async (coach) => {
      const coachWhere: Prisma.BookingWhereInput = { ...bookingWhere, coachUserId: coach.id };

      // Count sessions, not raw bookings. A ONE_TO_MANY slot with N students = 1 session.
      // For each status: count distinct slots (group sessions) + individual bookings (no slot).
      const countSessions = async (status: BookingStatus): Promise<number> => {
        const statusWhere = { ...coachWhere, status };
        const [slotGroups, individual] = await Promise.all([
          prisma.booking.groupBy({
            by: ["scheduleSlotId"],
            where: { ...statusWhere, scheduleSlotId: { not: null } },
          }),
          prisma.booking.count({ where: { ...statusWhere, scheduleSlotId: null } }),
        ]);
        return slotGroups.length + individual;
      };

      const [completed, noShow, cancelled] = await Promise.all([
        countSessions(BookingStatus.COMPLETED),
        countSessions(BookingStatus.NO_SHOW),
        countSessions(BookingStatus.CANCELLED),
      ]);

      const total = completed + noShow + cancelled;

      return {
        "Coach Name": `${coach.firstName} ${coach.lastName}`,
        Email: coach.email,
        "Total Sessions": total,
        Completed: completed,
        "No-Show": noShow,
        Cancelled: cancelled,
        "Completion Rate (%)": total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    }),
  );

  const dateStr = new Date().toISOString().split("T")[0];
  return {
    data: reportData,
    csv: convertToCSV(reportData),
    filename: `performance_report_${dateStr}.csv`,
  };
};

export const getStudentReport = async (
  caller: CallerContext,
  timeframeRaw?: string,
): Promise<{ data: any[]; csv: string; filename: string }> => {
  requireAdmin(caller);
  const timeframe = resolveTimeframe(timeframeRaw);
  const dateFilter = buildDateFilter(timeframe);

  const where: Prisma.StudentWhereInput = {
    ...(dateFilter ? { createdAt: dateFilter } : {}),
  };

  const students = await prisma.student.findMany({
    where,
    include: {
      _count: { select: { bookings: true } },
    },
    orderBy: { lastBookedAt: "desc" },
  });

  const reportData = students.map((s) => ({
    "Student Name": s.fullName,
    Email: s.email,
    "Total Sessions": s._count.bookings,
    "First Booked": s.firstBookedAt || "N/A",
    "Last Booked": s.lastBookedAt || "N/A",
    "Added Date": s.createdAt,
  }));

  const dateStr = new Date().toISOString().split("T")[0];
  return {
    data: reportData,
    csv: convertToCSV(reportData),
    filename: `student_engagement_report_${dateStr}.csv`,
  };
};
