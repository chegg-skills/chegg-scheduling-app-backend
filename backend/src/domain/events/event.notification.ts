import { UserRole } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import { logger } from "../../shared/logging/logger";
import {
  publishNotificationSafely,
  resolveFrontendUrl,
} from "../../shared/notifications/notification.publisher";

type EventStatusChangedNotificationInput = {
  eventId: string;
  eventName: string;
  isActive: boolean;
  callerId: string;
};

const queueEventStatusChangedNotification = async (
  input: EventStatusChangedNotificationInput,
): Promise<void> => {
  try {
    const [caller, superAdmins, eventWithTeam] = await Promise.all([
      prisma.user.findUnique({
        where: { id: input.callerId },
        select: { email: true, firstName: true, lastName: true },
      }),
      prisma.user.findMany({
        where: { role: UserRole.SUPER_ADMIN, isActive: true },
        select: { email: true },
      }),
      prisma.event.findUnique({
        where: { id: input.eventId },
        select: {
          team: {
            select: {
              teamLead: {
                select: { email: true },
              },
            },
          },
        },
      }),
    ]);

    if (!caller?.email) {
      return;
    }

    const changedByName = `${caller.firstName} ${caller.lastName}`.trim();
    const notificationType = input.isActive ? "EVENT_ACTIVATED" : "EVENT_DEACTIVATED";
    const frontendUrl = resolveFrontendUrl();
    const variables = { eventName: input.eventName, changedByName, frontendUrl };

    // 1. Notify the caller who made the status change
    await publishNotificationSafely({
      type: notificationType,
      recipients: caller.email,
      userId: input.callerId,
      variables,
    });

    // 2. Notify the Team Lead/Admin of the event's parent team
    const teamLeadEmail = eventWithTeam?.team?.teamLead?.email;
    if (teamLeadEmail && teamLeadEmail !== caller.email) {
      await publishNotificationSafely({
        type: notificationType,
        recipients: teamLeadEmail,
        variables,
      });
    }

    // 3. Notify all other Super Admins (excluding the caller and the team lead who were already notified)
    const superAdminEmails = superAdmins
      .map((sa) => sa.email)
      .filter(
        (email): email is string =>
          Boolean(email) && email !== caller.email && email !== teamLeadEmail,
      );

    if (superAdminEmails.length > 0) {
      await publishNotificationSafely({
        type: notificationType,
        recipients: superAdminEmails,
        variables,
      });
    }
  } catch (error) {
    logger.error("Failed to queue event status changed notification.", {
      eventId: input.eventId,
      callerId: input.callerId,
      isActive: input.isActive,
      error,
    });
  }
};

export { queueEventStatusChangedNotification };
