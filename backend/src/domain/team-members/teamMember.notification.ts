import { prisma } from "../../shared/db/prisma";
import { logger } from "../../shared/logging/logger";
import {
    publishNotificationSafely,
    resolveFrontendUrl,
} from "../../shared/notifications/notification.publisher";

type TeamMemberAddedNotificationInput = {
    teamId: string;
    userId: string;
};

const queueTeamMemberAddedNotification = async (
    input: TeamMemberAddedNotificationInput,
) => {
    try {
        const [team, user] = await Promise.all([
            prisma.team.findUnique({
                where: { id: input.teamId },
                select: { name: true, isActive: true },
            }),
            prisma.user.findUnique({
                where: { id: input.userId },
                select: { email: true, firstName: true, lastName: true },
            }),
        ]);

        if (!team || !user || !team.isActive) {
            return;
        }

        const userName = `${user.firstName} ${user.lastName}`.trim();

        await publishNotificationSafely({
            type: "TEAM_MEMBER_ADDED",
            recipients: user.email,
            userId: input.userId,
            variables: {
                teamName: team.name,
                userName,
                frontendUrl: resolveFrontendUrl(),
            },
        });
    } catch (error) {
        logger.error("Failed to queue team member added notification.", {
            teamId: input.teamId,
            userId: input.userId,
            error,
        });
    }
};

export { queueTeamMemberAddedNotification };
