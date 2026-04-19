import { prisma } from "../../shared/db/prisma";
import { logger } from "../../shared/logging/logger";
import {
  publishNotificationSafely,
  resolveFrontendUrl,
} from "../../shared/notifications/notification.publisher";

type EventCoachAddedNotificationInput = {
  eventId: string;
  coachUserId: string;
};

const queueEventCoachAddedNotification = async (input: EventCoachAddedNotificationInput) => {
  try {
    const [event, user] = await Promise.all([
      prisma.event.findUnique({
        where: { id: input.eventId },
        select: { name: true, isActive: true },
      }),
      prisma.user.findUnique({
        where: { id: input.coachUserId },
        select: { email: true, firstName: true, lastName: true },
      }),
    ]);

    if (!event || !user || !event.isActive) {
      return;
    }

    const userName = `${user.firstName} ${user.lastName}`.trim();

    await publishNotificationSafely({
      type: "EVENT_COACH_ADDED",
      recipients: user.email,
      userId: input.coachUserId,
      variables: {
        eventName: event.name,
        userName,
        frontendUrl: resolveFrontendUrl(),
      },
    });
  } catch (error) {
    logger.error("Failed to queue event coach added notification.", {
      eventId: input.eventId,
      coachUserId: input.coachUserId,
      error,
    });
  }
};

export { queueEventCoachAddedNotification };
