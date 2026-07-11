import {
  publishNotificationSafely,
  resolveFrontendUrl,
} from "../../shared/notifications/notification.publisher";
import { formatExpiryDate } from "../../shared/utils/date";
import type { SafeUser } from "../../shared/utils/userUtils";

export const queueZoomIsvLinkExpiryReminder = async (user: SafeUser): Promise<void> => {
  const expiresAt = user.zoomIsvLinkExpiresAt as Date | null;
  const reminderDays = user.zoomIsvLinkReminderDays as number | null;

  if (!expiresAt || !reminderDays || !user.zoomIsvLink) {
    return;
  }

  const sendAt = new Date(expiresAt.getTime() - reminderDays * 24 * 60 * 60 * 1000);
  if (sendAt <= new Date()) {
    return;
  }

  const expiryDateStr = formatExpiryDate(expiresAt, user.timezone);

  await publishNotificationSafely({
    type: "ZOOM_ISV_LINK_EXPIRY_REMINDER",
    recipients: user.email,
    userId: user.id,
    notificationKey: `zoom-isv-expiry:${user.id}`,
    sendAt: sendAt.toISOString(),
    variables: {
      coachName: `${user.firstName} ${user.lastName}`.trim(),
      expiryDate: expiryDateStr,
      reminderDays: String(reminderDays),
      frontendUrl: resolveFrontendUrl(),
    },
  });
};
