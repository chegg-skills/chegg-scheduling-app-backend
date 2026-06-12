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
    logger.error({ eventId: input.eventId, callerId: input.callerId, isActive: input.isActive, error }, "Failed to queue event status changed notification.");
  }
};

/**
 * Cancels any previously-scheduled EVENT_LOCATION_LINK_EXPIRY_REMINDER for the given
 * event. Called when the expiry configuration is cleared or when the event is deleted.
 * Fire-and-forget — errors are logged but not re-thrown.
 */
const cancelEventLinkExpiryReminder = async (eventId: string): Promise<void> => {
  await publishNotificationSafely({
    type: "CANCEL_EVENT_LINK_EXPIRY_REMINDER",
    recipients: "",
    entityType: "Event",
    entityId: eventId,
  });
};

const queueEventLinkExpiryReminder = async (event: any): Promise<void> => {
  const expiresAt = event.locationLinkExpiresAt as Date | null;
  const reminderDays = event.locationLinkReminderDays as number | null;

  // If the expiry feature is disabled (or location value is gone), cancel any
  // previously-scheduled reminder so the old notification doesn't fire.
  if (!expiresAt || !reminderDays || !event.locationValue) {
    await cancelEventLinkExpiryReminder(event.id);
    return;
  }

  try {
    // Resolve the Team Lead (Admin) of the parent team
    const eventWithTeam = await prisma.event.findUnique({
      where: { id: event.id },
      select: {
        team: {
          select: {
            teamLead: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    const teamLead = eventWithTeam?.team?.teamLead;
    if (!teamLead?.email) {
      return;
    }

    const sendAt = new Date(expiresAt.getTime() - reminderDays * 24 * 60 * 60 * 1000);
    if (sendAt <= new Date()) {
      // Reminder window has already passed — cancel any stale scheduled record.
      await cancelEventLinkExpiryReminder(event.id);
      return;
    }

    const expiryDateStr = expiresAt.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });

    const userName = `${teamLead.firstName} ${teamLead.lastName}`.trim();

    await publishNotificationSafely({
      type: "EVENT_LOCATION_LINK_EXPIRY_REMINDER",
      recipients: teamLead.email,
      userId: teamLead.id,
      notificationKey: `event-link-expiry:${event.id}`,
      entityType: "Event",
      entityId: event.id,
      sendAt: sendAt.toISOString(),
      variables: {
        eventId: event.id,
        userName,
        eventName: event.name,
        expiryDate: expiryDateStr,
        reminderDays: String(reminderDays),
        frontendUrl: resolveFrontendUrl(),
      },
    });
  } catch (error) {
    logger.error({ eventId: event.id, error }, "Failed to queue event link expiry reminder.");
  }
};

export { queueEventStatusChangedNotification, queueEventLinkExpiryReminder, cancelEventLinkExpiryReminder };
