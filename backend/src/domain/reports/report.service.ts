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

  const statusFilter = {
    in: [BookingStatus.COMPLETED, BookingStatus.NO_SHOW, BookingStatus.CANCELLED] as BookingStatus[],
  };
  const dateWhere: Prisma.BookingWhereInput = dateFilter ? { startTime: dateFilter } : {};

  // 3 parallel queries regardless of coach count (replaces N×6 per-coach queries)
  const [coaches, slotRows, individualRows] = await Promise.all([
    prisma.user.findMany({ where: { role: UserRole.COACH, isActive: true } }),
    // Each (coachUserId, scheduleSlotId, status) row = 1 distinct session
    prisma.booking.groupBy({
      by: ["coachUserId", "scheduleSlotId", "status"],
      where: { ...dateWhere, status: statusFilter, scheduleSlotId: { not: null } },
    }),
    // Individual bookings (no slot) grouped by coach+status
    prisma.booking.groupBy({
      by: ["coachUserId", "status"],
      where: { ...dateWhere, status: statusFilter, scheduleSlotId: null },
      _count: { id: true },
    }),
  ]);

  type StatusKey = "COMPLETED" | "NO_SHOW" | "CANCELLED";
  type SessionCounts = Record<StatusKey, number>;
  const sessionCounts = new Map<string, SessionCounts>();
  const zero = (): SessionCounts => ({ COMPLETED: 0, NO_SHOW: 0, CANCELLED: 0 });

  for (const row of slotRows) {
    if (!row.coachUserId) continue;
    const entry = sessionCounts.get(row.coachUserId) ?? zero();
    entry[row.status as StatusKey] = (entry[row.status as StatusKey] ?? 0) + 1;
    sessionCounts.set(row.coachUserId, entry);
  }

  for (const row of individualRows) {
    if (!row.coachUserId) continue;
    const entry = sessionCounts.get(row.coachUserId) ?? zero();
    entry[row.status as StatusKey] = (entry[row.status as StatusKey] ?? 0) + (row._count?.id ?? 0);
    sessionCounts.set(row.coachUserId, entry);
  }

  const reportData = coaches.map((coach) => {
    const counts = sessionCounts.get(coach.id) ?? zero();
    const total = counts.COMPLETED + counts.NO_SHOW + counts.CANCELLED;
    return {
      "Coach Name": `${coach.firstName} ${coach.lastName}`,
      Email: coach.email,
      "Total Sessions": total,
      Completed: counts.COMPLETED,
      "No-Show": counts.NO_SHOW,
      Cancelled: counts.CANCELLED,
      "Completion Rate (%)": total > 0 ? Math.round((counts.COMPLETED / total) * 100) : 0,
    };
  });

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
