import { prisma } from "../db/prisma";

export type ResolvedNotificationConfig = {
  reminderOffsets: number[];
  adminNotifyOnBooking: boolean;
  adminNotifyOnCancellation: boolean;
  adminNotifyOnNoShow: boolean;
  coachNotifyOnBooking: boolean;
  coachNotifyOnCancellation: boolean;
  coachNotifyOnNoShow: boolean;
  notifyLeadOnAvailability: boolean;
  sendFeedbackLink: boolean;
};

export const DEFAULT_NOTIFICATION_CONFIG: ResolvedNotificationConfig = {
  reminderOffsets: [1440, 60],
  adminNotifyOnBooking: true,
  adminNotifyOnCancellation: true,
  adminNotifyOnNoShow: true,
  coachNotifyOnBooking: true,
  coachNotifyOnCancellation: true,
  coachNotifyOnNoShow: true,
  notifyLeadOnAvailability: true,
  sendFeedbackLink: false,
};

/**
 * Fetches the notification configuration for a team.
 * Falls back to DEFAULT_NOTIFICATION_CONFIG if no custom configuration exists.
 */
export async function getTeamNotificationConfig(
  teamId: string,
): Promise<ResolvedNotificationConfig> {
  const row = await prisma.teamNotificationConfig.findUnique({
    where: { teamId },
    select: {
      reminderOffsets: true,
      adminNotifyOnBooking: true,
      adminNotifyOnCancellation: true,
      adminNotifyOnNoShow: true,
      coachNotifyOnBooking: true,
      coachNotifyOnCancellation: true,
      coachNotifyOnNoShow: true,
      notifyLeadOnAvailability: true,
      sendFeedbackLink: true,
    },
  });

  if (!row) {
    return DEFAULT_NOTIFICATION_CONFIG;
  }

  return {
    reminderOffsets: row.reminderOffsets,
    adminNotifyOnBooking: row.adminNotifyOnBooking,
    adminNotifyOnCancellation: row.adminNotifyOnCancellation,
    adminNotifyOnNoShow: row.adminNotifyOnNoShow,
    coachNotifyOnBooking: row.coachNotifyOnBooking,
    coachNotifyOnCancellation: row.coachNotifyOnCancellation,
    coachNotifyOnNoShow: row.coachNotifyOnNoShow,
    notifyLeadOnAvailability: row.notifyLeadOnAvailability,
    sendFeedbackLink: row.sendFeedbackLink,
  };
}
