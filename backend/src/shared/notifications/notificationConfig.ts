import { prisma } from "../db/prisma";

export type ResolvedNotificationConfig = {
  reminderOffsets: number[];
  poolReminderOffsets: number[];
  adminNotifyOnBooking: boolean;
  adminNotifyOnCancellation: boolean;
  adminNotifyOnNoShow: boolean;
  coachNotifyOnBooking: boolean;
  coachNotifyOnCancellation: boolean;
  coachNotifyOnNoShow: boolean;
  notifyLeadOnAvailability: boolean;
  sendFeedbackLink: boolean;
  feedbackFormLink: string | null;
};

export const DEFAULT_NOTIFICATION_CONFIG: ResolvedNotificationConfig = {
  reminderOffsets: [1440, 60],
  poolReminderOffsets: [1440, 360],
  adminNotifyOnBooking: true,
  adminNotifyOnCancellation: true,
  adminNotifyOnNoShow: true,
  coachNotifyOnBooking: true,
  coachNotifyOnCancellation: true,
  coachNotifyOnNoShow: true,
  notifyLeadOnAvailability: true,
  sendFeedbackLink: false,
  feedbackFormLink: null,
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
      poolReminderOffsets: true,
      adminNotifyOnBooking: true,
      adminNotifyOnCancellation: true,
      adminNotifyOnNoShow: true,
      coachNotifyOnBooking: true,
      coachNotifyOnCancellation: true,
      coachNotifyOnNoShow: true,
      notifyLeadOnAvailability: true,
      sendFeedbackLink: true,
      feedbackFormLink: true,
    },
  });

  if (!row) {
    return DEFAULT_NOTIFICATION_CONFIG;
  }

  return {
    reminderOffsets: row.reminderOffsets,
    poolReminderOffsets: row.poolReminderOffsets,
    adminNotifyOnBooking: row.adminNotifyOnBooking,
    adminNotifyOnCancellation: row.adminNotifyOnCancellation,
    adminNotifyOnNoShow: row.adminNotifyOnNoShow,
    coachNotifyOnBooking: row.coachNotifyOnBooking,
    coachNotifyOnCancellation: row.coachNotifyOnCancellation,
    coachNotifyOnNoShow: row.coachNotifyOnNoShow,
    notifyLeadOnAvailability: row.notifyLeadOnAvailability,
    sendFeedbackLink: row.sendFeedbackLink,
    feedbackFormLink: row.feedbackFormLink,
  };
}
