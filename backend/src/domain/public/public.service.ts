import { prisma } from "../../shared/db/prisma";

/**
 * List all active teams for public discovery.
 */
export const listTeams = async () => {
    return prisma.team.findMany({
        where: { isActive: true },
        select: {
            id: true,
            name: true,
            description: true,
        },
        orderBy: { name: "asc" },
    });
};

/**
 * List all active events for a specific team.
 */
export const listTeamEvents = async (teamId: string) => {
    return prisma.event.findMany({
        where: { teamId, isActive: true },
        select: {
            id: true,
            name: true,
            description: true,
            durationSeconds: true,
            locationType: true,
        },
        orderBy: { name: "asc" },
    });
};
