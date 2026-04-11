import { prisma } from "../../shared/db/prisma";
import { logger } from "../../shared/logging/logger";
import {
    publishNotificationSafely,
    resolveFrontendUrl,
} from "../../shared/notifications/notification.publisher";

type EventHostAddedNotificationInput = {
    eventId: string;
    hostUserId: string;
};

const queueEventHostAddedNotification = async (
    input: EventHostAddedNotificationInput,
) => {
    try {
        const [event, user] = await Promise.all([
            prisma.event.findUnique({
                where: { id: input.eventId },
                select: { name: true, isActive: true },
            }),
            prisma.user.findUnique({
                where: { id: input.hostUserId },
                select: { email: true, firstName: true, lastName: true },
            }),
        ]);

        if (!event || !user || !event.isActive) {
            return;
        }

        const userName = `${user.firstName} ${user.lastName}`.trim();

        await publishNotificationSafely({
            type: "EVENT_HOST_ADDED",
            recipients: user.email,
            userId: input.hostUserId,
            variables: {
                eventName: event.name,
                userName,
                frontendUrl: resolveFrontendUrl(),
            },
        });
    } catch (error) {
        logger.error("Failed to queue event host added notification.", {
            eventId: input.eventId,
            hostUserId: input.hostUserId,
            error,
        });
    }
};

export { queueEventHostAddedNotification };
