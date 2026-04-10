import { BookingStatus, UserRole, Prisma } from '@prisma/client'
import { prisma } from '../../shared/db/prisma'
import { convertToCSV } from '../../shared/utils/csv'
import { resolveTimeframe, buildDateFilter, requireAdmin } from '../stats/stats.shared'
import type { CallerContext } from '../../shared/utils/userUtils'
import { ErrorHandler } from '../../shared/error/errorhandler'
import { StatusCodes } from 'http-status-codes'

export const getBookingsReport = async (
    caller: CallerContext,
    timeframeRaw?: string,
): Promise<{ csv: string; filename: string }> => {
    requireAdmin(caller)
    const timeframe = resolveTimeframe(timeframeRaw)
    const dateFilter = buildDateFilter(timeframe)

    const where: Prisma.BookingWhereInput = {
        ...(dateFilter ? { startTime: dateFilter } : {}),
        ...(caller.role === UserRole.TEAM_ADMIN ? { team: { teamLeadId: caller.id } } : {}),
    }

    const bookings = await prisma.booking.findMany({
        where,
        include: {
            event: true,
            host: true,
            team: true,
            student: true,
        },
        orderBy: { startTime: 'desc' },
    })

    const reportData = bookings.map(b => ({
        'Booking ID': b.id,
        'Date/Time (UTC)': b.startTime,
        'Status': b.status,
        'Team': b.team.name,
        'Event': b.event.name,
        'Coach': `${b.host.firstName} ${b.host.lastName}`,
        'Student Name': b.studentName,
        'Student Email': b.studentEmail,
        'Duration (Min)': Math.round((b.endTime.getTime() - b.startTime.getTime()) / 60000),
        'Objectives': b.sessionObjectives || '',
        'Specific Question': b.specificQuestion || '',
        'Notes': b.notes || '',
    }))

    const dateStr = new Date().toISOString().split('T')[0]
    return {
        csv: convertToCSV(reportData),
        filename: `bookings_report_${dateStr}.csv`,
    }
}

export const getPerformanceReport = async (
    caller: CallerContext,
    timeframeRaw?: string,
): Promise<{ csv: string; filename: string }> => {
    requireAdmin(caller)
    const timeframe = resolveTimeframe(timeframeRaw)
    const dateFilter = buildDateFilter(timeframe)

    const bookingWhere: Prisma.BookingWhereInput = {
        ...(dateFilter ? { startTime: dateFilter } : {}),
    }

    // Get all coaches
    const coaches = await prisma.user.findMany({
        where: {
            role: UserRole.COACH,
            isActive: true,
        },
    })

    const reportData = await Promise.all(
        coaches.map(async coach => {
            const stats = await prisma.booking.groupBy({
                by: ['status'],
                where: {
                    ...bookingWhere,
                    hostUserId: coach.id,
                },
                _count: { _all: true },
            })

            const counts = stats.reduce(
                (acc, curr) => {
                    acc[curr.status] = curr._count._all
                    return acc
                },
                {} as Record<string, number>,
            )

            const total = Object.values(counts).reduce((a, b) => a + b, 0)

            return {
                'Coach Name': `${coach.firstName} ${coach.lastName}`,
                'Email': coach.email,
                'Total Bookings': total,
                'Completed': counts[BookingStatus.COMPLETED] || 0,
                'No-Show': counts[BookingStatus.NO_SHOW] || 0,
                'Cancelled': counts[BookingStatus.CANCELLED] || 0,
                'Completion Rate (%)': total > 0
                    ? Math.round(((counts[BookingStatus.COMPLETED] || 0) / total) * 100)
                    : 0,
            }
        }),
    )

    const dateStr = new Date().toISOString().split('T')[0]
    return {
        csv: convertToCSV(reportData),
        filename: `performance_report_${dateStr}.csv`,
    }
}

export const getStudentReport = async (
    caller: CallerContext,
    timeframeRaw?: string,
): Promise<{ csv: string; filename: string }> => {
    requireAdmin(caller)
    const timeframe = resolveTimeframe(timeframeRaw)
    const dateFilter = buildDateFilter(timeframe)

    const where: Prisma.StudentWhereInput = {
        ...(dateFilter ? { createdAt: dateFilter } : {}),
    }

    const students = await prisma.student.findMany({
        where,
        include: {
            _count: { select: { bookings: true } },
        },
        orderBy: { lastBookedAt: 'desc' },
    })

    const reportData = students.map(s => ({
        'Student Name': s.fullName,
        'Email': s.email,
        'Total Sessions': s._count.bookings,
        'First Booked': s.firstBookedAt || 'N/A',
        'Last Booked': s.lastBookedAt || 'N/A',
        'Added Date': s.createdAt,
    }))

    const dateStr = new Date().toISOString().split('T')[0]
    return {
        csv: convertToCSV(reportData),
        filename: `student_engagement_report_${dateStr}.csv`,
    }
}
