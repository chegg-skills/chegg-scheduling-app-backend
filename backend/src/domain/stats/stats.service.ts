import { AssignmentStrategy, BookingStatus, Prisma, UserRole } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'
import { prisma } from '../../shared/db/prisma'
import { ErrorHandler } from '../../shared/error/errorhandler'
import { getManagedTeam } from '../../shared/utils/teamAccess'
import type { CallerContext } from '../../shared/utils/userUtils'

export type StatsTimeframeKey =
    | 'today' | 'yesterday'
    | 'thisWeek' | 'lastWeek'
    | 'thisMonth' | 'lastMonth'
    | 'thisQuarter' | 'lastQuarter'
    | 'thisYear' | 'lastYear' | 'all'
    | string

type ResolvedTimeframe = {
    key: StatsTimeframeKey
    label: string
    start: Date | null
    end: Date | null
    rangeLabel: string
}

type StatsResponse<TMetrics extends Record<string, any>> = {
    timeframe: {
        key: StatsTimeframeKey
        label: string
        startDate: string | null
        endDate: string | null
        rangeLabel: string
    }
    metrics: TMetrics
}

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
})

const formatRangeLabel = (start: Date | null, end: Date | null): string => {
    if (!start || !end) return 'All time'
    return `${DATE_FORMATTER.format(start)} – ${DATE_FORMATTER.format(end)}`
}

const resolveTimeframe = (timeframe?: string): ResolvedTimeframe => {
    const customPrefix = 'custom:'
    if (timeframe?.startsWith(customPrefix)) {
        const parts = timeframe.substring(customPrefix.length).split(':')
        if (parts.length === 2) {
            const start = new Date(parts[0])
            const end = new Date(parts[1])
            // Move end to 23:59:59 if it's currently midnight from simple date strings
            if (end.getHours() === 0) end.setHours(23, 59, 59, 999)

            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                return { key: timeframe, label: 'Custom Range', start, end, rangeLabel: formatRangeLabel(start, end) }
            }
        }
    }

    const normalized = (timeframe?.trim() || 'thisMonth') as StatsTimeframeKey
    const now = new Date()

    // Base utilities
    const getStartOfDate = (d: Date) => { const r = new Date(d); r.setHours(0, 0, 0, 0); return r }
    const getEndOfDate = (d: Date) => { const r = new Date(d); r.setHours(23, 59, 59, 999); return r }

    switch (normalized) {
        case 'today': {
            const start = getStartOfDate(now); const end = getEndOfDate(now)
            return { key: 'today', label: 'Today', start, end, rangeLabel: formatRangeLabel(start, end) }
        }
        case 'yesterday': {
            const d = new Date(now); d.setDate(d.getDate() - 1)
            const start = getStartOfDate(d); const end = getEndOfDate(d)
            return { key: 'yesterday', label: 'Yesterday', start, end, rangeLabel: formatRangeLabel(start, end) }
        }
        case 'thisWeek': {
            const start = getStartOfDate(now); const day = start.getDay(); const diff = day === 0 ? -6 : 1 - day
            start.setDate(start.getDate() + diff);
            const end = getEndOfDate(start); end.setDate(end.getDate() + 6)
            return { key: 'thisWeek', label: 'This week', start, end, rangeLabel: formatRangeLabel(start, end) }
        }
        case 'lastWeek': {
            const start = getStartOfDate(now); const day = start.getDay(); const diff = day === 0 ? -6 : 1 - day
            start.setDate(start.getDate() + diff - 7);
            const end = getEndOfDate(start); end.setDate(end.getDate() + 6)
            return { key: 'lastWeek', label: 'Last week', start, end, rangeLabel: formatRangeLabel(start, end) }
        }
        case 'thisMonth': {
            const start = new Date(now.getFullYear(), now.getMonth(), 1); start.setHours(0, 0, 0, 0)
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); end.setHours(23, 59, 59, 999)
            return { key: 'thisMonth', label: 'This month', start, end, rangeLabel: formatRangeLabel(start, end) }
        }
        case 'lastMonth': {
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1); start.setHours(0, 0, 0, 0)
            const end = new Date(now.getFullYear(), now.getMonth(), 0); end.setHours(23, 59, 59, 999)
            return { key: 'lastMonth', label: 'Last month', start, end, rangeLabel: formatRangeLabel(start, end) }
        }
        case 'thisQuarter': {
            const qStartMonth = Math.floor(now.getMonth() / 3) * 3
            const start = new Date(now.getFullYear(), qStartMonth, 1); start.setHours(0, 0, 0, 0)
            const end = new Date(now.getFullYear(), qStartMonth + 3, 0); end.setHours(23, 59, 59, 999)
            return { key: 'thisQuarter', label: 'This quarter', start, end, rangeLabel: formatRangeLabel(start, end) }
        }
        case 'lastQuarter': {
            const qStartMonth = Math.floor(now.getMonth() / 3) * 3 - 3
            const start = new Date(now.getFullYear(), qStartMonth, 1); start.setHours(0, 0, 0, 0)
            const end = new Date(now.getFullYear(), qStartMonth + 3, 0); end.setHours(23, 59, 59, 999)
            return { key: 'lastQuarter', label: 'Last quarter', start, end, rangeLabel: formatRangeLabel(start, end) }
        }
        case 'thisYear': {
            const start = new Date(now.getFullYear(), 0, 1); start.setHours(0, 0, 0, 0)
            const end = new Date(now.getFullYear(), 11, 31); end.setHours(23, 59, 59, 999)
            return { key: 'thisYear', label: 'This year', start, end, rangeLabel: formatRangeLabel(start, end) }
        }
        case 'lastYear': {
            const start = new Date(now.getFullYear() - 1, 0, 1); start.setHours(0, 0, 0, 0)
            const end = new Date(now.getFullYear() - 1, 11, 31); end.setHours(23, 59, 59, 999)
            return { key: 'lastYear', label: 'Last year', start, end, rangeLabel: formatRangeLabel(start, end) }
        }
        case 'all':
            return { key: 'all', label: 'All time', start: null, end: null, rangeLabel: 'All time' }
        default:
            // Fallback
            const startFallback = new Date(now.getFullYear(), now.getMonth(), 1); startFallback.setHours(0, 0, 0, 0)
            const endFallback = new Date(now.getFullYear(), now.getMonth() + 1, 0); endFallback.setHours(23, 59, 59, 999)
            return { key: 'thisMonth', label: 'This month', start: startFallback, end: endFallback, rangeLabel: formatRangeLabel(startFallback, endFallback) }
    }
}

const toResponseTimeframe = (timeframe: ResolvedTimeframe) => ({
    key: timeframe.key,
    label: timeframe.label,
    startDate: timeframe.start?.toISOString() ?? null,
    endDate: timeframe.end?.toISOString() ?? null,
    rangeLabel: timeframe.rangeLabel,
})

const requireAdmin = (caller: CallerContext): void => {
    if (caller.role !== UserRole.SUPER_ADMIN && caller.role !== UserRole.TEAM_ADMIN) {
        throw new ErrorHandler(StatusCodes.FORBIDDEN, 'You are not authorized to view these stats.')
    }
}

const buildDateFilter = (timeframe: ResolvedTimeframe): Prisma.DateTimeFilter | undefined => {
    if (!timeframe.start || !timeframe.end) {
        return undefined
    }

    return {
        gte: timeframe.start,
        lte: timeframe.end,
    }
}

const buildBookingWhere = (
    caller: CallerContext,
    timeframe: ResolvedTimeframe,
): Prisma.BookingWhereInput => {
    const dateFilter = buildDateFilter(timeframe)

    return {
        ...(caller.role === UserRole.COACH ? { hostUserId: caller.id } : {}),
        ...(dateFilter ? { startTime: dateFilter } : {}),
    }
}

const buildUpcomingBookingWhere = (
    caller: CallerContext,
    timeframe: ResolvedTimeframe,
): Prisma.BookingWhereInput => {
    const now = new Date()
    const dateFilter = buildDateFilter(timeframe)

    return {
        ...(caller.role === UserRole.COACH ? { hostUserId: caller.id } : {}),
        status: BookingStatus.CONFIRMED,
        startTime: {
            ...(dateFilter ?? {}),
            gte: now,
        },
    }
}

export const getBookingStats = async (
    caller: CallerContext,
    timeframeRaw?: string,
): Promise<StatsResponse<{
    totalBookings: number
    upcomingBookings: number
    completedBookings: number
    cancelledBookings: number
    mostBookedCoach?: { id: string; name: string; count: number } | null
    mostBookedTeam?: { id: string; name: string; count: number } | null
}>> => {
    const timeframe = resolveTimeframe(timeframeRaw)
    const bookingWhere = buildBookingWhere(caller, timeframe)

    const [totalBookings, upcomingBookings, completedBookings, cancelledBookings] = await Promise.all([
        prisma.booking.count({ where: bookingWhere }),
        prisma.booking.count({ where: buildUpcomingBookingWhere(caller, timeframe) }),
        prisma.booking.count({ where: { ...bookingWhere, status: BookingStatus.COMPLETED } }),
        prisma.booking.count({ where: { ...bookingWhere, status: BookingStatus.CANCELLED } }),
    ])

    // Aggregations for Coaches
    let mostBookedCoach = null
    let mostBookedTeam = null

    if (totalBookings > 0) {
        const coachGroup = await prisma.booking.groupBy({
            by: ['hostUserId'],
            where: bookingWhere,
            _count: { _all: true },
            orderBy: { _count: { hostUserId: 'desc' } },
            take: 1
        })

        if (coachGroup.length > 0 && coachGroup[0].hostUserId) {
            const topCoach = await prisma.user.findUnique({ where: { id: coachGroup[0].hostUserId } })
            if (topCoach) {
                mostBookedCoach = { id: topCoach.id, name: `${topCoach.firstName} ${topCoach.lastName}`, count: coachGroup[0]._count._all }
            }
        }

        if (caller.role !== UserRole.COACH) {
            const teamGroup = await prisma.booking.groupBy({
                by: ['teamId'],
                where: bookingWhere,
                _count: { _all: true },
                orderBy: { _count: { teamId: 'desc' } },
                take: 1
            })

            if (teamGroup.length > 0 && teamGroup[0].teamId) {
                const topTeam = await prisma.team.findUnique({ where: { id: teamGroup[0].teamId } })
                if (topTeam) {
                    mostBookedTeam = { id: topTeam.id, name: topTeam.name, count: teamGroup[0]._count._all }
                }
            }
        }
    }

    return {
        timeframe: toResponseTimeframe(timeframe),
        metrics: {
            totalBookings,
            upcomingBookings,
            completedBookings,
            cancelledBookings,
            ...(mostBookedCoach ? { mostBookedCoach } : {}),
            ...(mostBookedTeam ? { mostBookedTeam } : {}),
        },
    }
}

export const getUserStats = async (
    caller: CallerContext,
    timeframeRaw?: string,
): Promise<StatsResponse<{
    newUsers: number
    activeUsers: number
    pendingInvites: number
    coaches: number
}>> => {
    requireAdmin(caller)
    const timeframe = resolveTimeframe(timeframeRaw)
    const createdAt = buildDateFilter(timeframe)
    const now = new Date()

    const [newUsers, activeUsers, pendingInvites, coaches] = await Promise.all([
        prisma.user.count({ where: createdAt ? { createdAt } : undefined }),
        prisma.user.count({ where: { isActive: true } }),
        prisma.userInvite.count({ where: { acceptedAt: null, expiresAt: { gte: now } } }),
        prisma.user.count({ where: { role: UserRole.COACH, isActive: true } }),
    ])

    return {
        timeframe: toResponseTimeframe(timeframe),
        metrics: {
            newUsers,
            activeUsers,
            pendingInvites,
            coaches,
        },
    }
}

export const getTeamStats = async (
    caller: CallerContext,
    timeframeRaw?: string,
): Promise<StatsResponse<{
    newTeams: number
    activeTeams: number
    activeMembers: number
    teamsWithEvents: number
}>> => {
    requireAdmin(caller)
    const timeframe = resolveTimeframe(timeframeRaw)
    const createdAt = buildDateFilter(timeframe)

    const [newTeams, activeTeams, activeMembers, teamsWithEvents] = await Promise.all([
        prisma.team.count({ where: createdAt ? { createdAt } : undefined }),
        prisma.team.count({ where: { isActive: true } }),
        prisma.teamMember.count({ where: { isActive: true } }),
        prisma.team.count({ where: { events: { some: {} } } }),
    ])

    return {
        timeframe: toResponseTimeframe(timeframe),
        metrics: {
            newTeams,
            activeTeams,
            activeMembers,
            teamsWithEvents,
        },
    }
}

export const getEventStats = async (
    caller: CallerContext,
    timeframeRaw?: string,
    teamId?: string,
): Promise<StatsResponse<{
    newEvents: number
    activeEvents: number
    roundRobinEvents: number
    hostedEvents: number
}>> => {
    requireAdmin(caller)

    if (teamId?.trim() && caller.role === UserRole.TEAM_ADMIN) {
        await getManagedTeam(teamId, caller, { allowInactive: true })
    }

    const timeframe = resolveTimeframe(timeframeRaw)
    const createdAt = buildDateFilter(timeframe)
    const scopedWhere: Prisma.EventWhereInput = teamId?.trim() ? { teamId } : {}

    const [newEvents, activeEvents, roundRobinEvents, hostedEvents] = await Promise.all([
        prisma.event.count({ where: { ...scopedWhere, ...(createdAt ? { createdAt } : {}) } }),
        prisma.event.count({ where: { ...scopedWhere, isActive: true } }),
        prisma.event.count({ where: { ...scopedWhere, assignmentStrategy: AssignmentStrategy.ROUND_ROBIN } }),
        prisma.event.count({ where: { ...scopedWhere, hosts: { some: { isActive: true } } } }),
    ])

    return {
        timeframe: toResponseTimeframe(timeframe),
        metrics: {
            newEvents,
            activeEvents,
            roundRobinEvents,
            hostedEvents,
        },
    }
}

export const getOfferingStats = async (
    caller: CallerContext,
    timeframeRaw?: string,
): Promise<StatsResponse<{
    newOfferings: number
    activeOfferings: number
    offeringsInUse: number
    unusedOfferings: number
}>> => {
    requireAdmin(caller)
    const timeframe = resolveTimeframe(timeframeRaw)
    const createdAt = buildDateFilter(timeframe)

    const [newOfferings, activeOfferings, offeringsInUse, unusedOfferings] = await Promise.all([
        prisma.eventOffering.count({ where: createdAt ? { createdAt } : undefined }),
        prisma.eventOffering.count({ where: { isActive: true } }),
        prisma.eventOffering.count({ where: { events: { some: {} } } }),
        prisma.eventOffering.count({ where: { events: { none: {} } } }),
    ])

    return {
        timeframe: toResponseTimeframe(timeframe),
        metrics: {
            newOfferings,
            activeOfferings,
            offeringsInUse,
            unusedOfferings,
        },
    }
}

export const getInteractionTypeStats = async (
    caller: CallerContext,
    timeframeRaw?: string,
): Promise<StatsResponse<{
    newInteractionTypes: number
    activeInteractionTypes: number
    multiHostEnabled: number
    roundRobinEnabled: number
}>> => {
    requireAdmin(caller)
    const timeframe = resolveTimeframe(timeframeRaw)
    const createdAt = buildDateFilter(timeframe)

    const [newInteractionTypes, activeInteractionTypes, multiHostEnabled, roundRobinEnabled] = await Promise.all([
        prisma.eventInteractionType.count({ where: createdAt ? { createdAt } : undefined }),
        prisma.eventInteractionType.count({ where: { isActive: true } }),
        prisma.eventInteractionType.count({ where: { supportsMultipleHosts: true, isActive: true } }),
        prisma.eventInteractionType.count({ where: { supportsRoundRobin: true, isActive: true } }),
    ])

    return {
        timeframe: toResponseTimeframe(timeframe),
        metrics: {
            newInteractionTypes,
            activeInteractionTypes,
            multiHostEnabled,
            roundRobinEnabled,
        },
    }
}

export const getDashboardStats = async (
    caller: CallerContext,
    timeframeRaw?: string,
): Promise<StatsResponse<{
    scheduledBookings: number
    upcomingBookings: number
    activeUsers: number
    activeEvents: number
    activeTeams: number
}>> => {
    const timeframe = resolveTimeframe(timeframeRaw)
    const bookingWhere = buildBookingWhere(caller, timeframe)
    const upcomingWhere = buildUpcomingBookingWhere(caller, timeframe)

    const activeEventsWhere: Prisma.EventWhereInput = caller.role === UserRole.COACH
        ? { hosts: { some: { hostUserId: caller.id, isActive: true } }, isActive: true }
        : { isActive: true }

    const activeTeamsPromise = caller.role === UserRole.COACH
        ? prisma.event.findMany({
            where: { hosts: { some: { hostUserId: caller.id, isActive: true } } },
            select: { teamId: true },
            distinct: ['teamId'],
        }).then((teams) => teams.length)
        : prisma.team.count({ where: { isActive: true } })

    const [scheduledBookings, upcomingBookings, activeUsers, activeEvents, activeTeams] = await Promise.all([
        prisma.booking.count({ where: bookingWhere }),
        prisma.booking.count({ where: upcomingWhere }),
        prisma.user.count({ where: { isActive: true } }),
        prisma.event.count({ where: activeEventsWhere }),
        activeTeamsPromise,
    ])

    return {
        timeframe: toResponseTimeframe(timeframe),
        metrics: {
            scheduledBookings,
            upcomingBookings,
            activeUsers,
            activeEvents,
            activeTeams,
        },
    }
}
