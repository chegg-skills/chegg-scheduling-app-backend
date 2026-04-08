import { UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { requireTrimmedString } from "../../shared/utils/validation";

const publicTeamSelect = {
    id: true,
    name: true,
    description: true,
    publicBookingSlug: true,
} as const;

const publicEventSelect = {
    id: true,
    name: true,
    description: true,
    durationSeconds: true,
    bookingMode: true,
    locationType: true,
    publicBookingSlug: true,
    teamId: true,
    allowedWeekdays: true,
    minimumNoticeMinutes: true,
    minParticipantCount: true,
    maxParticipantCount: true,
    team: {
        select: publicTeamSelect,
    },
} as const;

const publicCoachSelect = {
    id: true,
    firstName: true,
    lastName: true,
    avatarUrl: true,
    timezone: true,
    publicBookingSlug: true,
} as const;

const normalizeSlug = (slug: string, label: string): string => {
    return requireTrimmedString(slug, label, `${label} is required.`);
};

/**
 * List all active teams for public discovery.
 */
export const listTeams = async () => {
    return prisma.team.findMany({
        where: { isActive: true },
        select: publicTeamSelect,
        orderBy: { name: "asc" },
    });
};

export const getTeamBySlug = async (slug: string) => {
    const normalizedSlug = normalizeSlug(slug, "teamSlug");

    const team = await prisma.team.findFirst({
        where: {
            publicBookingSlug: normalizedSlug,
            isActive: true,
        },
        select: publicTeamSelect,
    });

    if (!team?.id) {
        throw new ErrorHandler(StatusCodes.NOT_FOUND, "Team not found.");
    }

    return team;
};

/**
 * List all active events for a specific team.
 */
export const listTeamEvents = async (teamId: string) => {
    return prisma.event.findMany({
        where: {
            teamId,
            isActive: true,
            team: { isActive: true },
        },
        select: publicEventSelect,
        orderBy: { name: "asc" },
    });
};

export const listTeamEventsBySlug = async (slug: string) => {
    const team = await getTeamBySlug(slug);
    const events = await listTeamEvents(team.id);
    return { team, events };
};

export const getEventBySlug = async (slug: string) => {
    const normalizedSlug = normalizeSlug(slug, "eventSlug");

    const event = await prisma.event.findFirst({
        where: {
            publicBookingSlug: normalizedSlug,
            isActive: true,
            team: { isActive: true },
        },
        select: publicEventSelect,
    });

    if (!event?.id || !event.team) {
        throw new ErrorHandler(StatusCodes.NOT_FOUND, "Event not found.");
    }

    return event;
};

export const getCoachBySlug = async (slug: string) => {
    const normalizedSlug = normalizeSlug(slug, "coachSlug");

    const coach = await prisma.user.findUnique({
        where: { publicBookingSlug: normalizedSlug },
        select: {
            ...publicCoachSelect,
            role: true,
            isActive: true,
        },
    });

    if (!coach || !coach.isActive || coach.role !== UserRole.COACH) {
        throw new ErrorHandler(StatusCodes.NOT_FOUND, "Coach not found.");
    }

    const { role: _role, isActive: _isActive, ...safeCoach } = coach;
    return safeCoach;
};

export const listCoachEventsBySlug = async (slug: string) => {
    const coach = await getCoachBySlug(slug);

    const events = await prisma.event.findMany({
        where: {
            isActive: true,
            team: { isActive: true },
            hosts: {
                some: {
                    hostUserId: coach.id,
                    isActive: true,
                },
            },
        },
        select: publicEventSelect,
        orderBy: { name: "asc" },
    });

    return { coach, events };
};
