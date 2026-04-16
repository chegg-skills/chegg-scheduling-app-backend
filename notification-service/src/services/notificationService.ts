import { NotificationStatus, Prisma, type Notification } from "@prisma/client";
import { renderTemplate } from "../templates/renderer";
import type { NotificationPayload } from "../types/notification";
import { DEFAULT_FROM_EMAIL, sendEmailWithRetry, type SentMessageInfo } from "./mailer";
import {
  createOrUpsertNotification,
  markNotificationAsFailed,
  markNotificationAsSent,
} from "./notificationRepository";

type NotificationSendResult =
  | SentMessageInfo
  | { skipped: true; notificationId: number; status: NotificationStatus }
  | { scheduled: true; notificationId: number; sendAt: string }
  | null;

const normalizeRecipients = (recipients: string | string[]): string => {
  if (Array.isArray(recipients)) {
    return recipients.filter(Boolean).join(", ");
  }
  return String(recipients ?? "").trim();
};

const normalizeSendAt = (value?: string | Date | null): Date | null => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildMailOptions = (record: Pick<Notification, "recipient" | "payload">) => {
  const payload =
    record.payload && typeof record.payload === "object" && !Array.isArray(record.payload)
      ? (record.payload as { subject?: string; text?: string; html?: string })
      : {};

  return {
    from: DEFAULT_FROM_EMAIL,
    to: record.recipient,
    subject: String(payload.subject ?? ""),
    text: String(payload.text ?? ""),
    html: String(payload.html ?? ""),
  };
};

export async function sendStoredNotification(
  record: Notification | null,
): Promise<NotificationSendResult> {
  if (!record) return null;

  if (
    record.status === NotificationStatus.SENT ||
    record.status === NotificationStatus.CANCELLED
  ) {
    return { skipped: true, notificationId: record.id, status: record.status };
  }

  try {
    const info = await sendEmailWithRetry(buildMailOptions(record));
    console.log("Email sent successfully:", info.messageId ?? info.response ?? info);
    await markNotificationAsSent(record.id);
    return info;
  } catch (error) {
    await markNotificationAsFailed(record.id, error);
    console.error("Error sending notification:", error);
    throw error;
  }
}

export async function sendNotification(
  payload: NotificationPayload,
): Promise<NotificationSendResult> {
  const {
    type,
    recipients,
    variables = {},
    userId = "",
    notificationKey,
    entityType,
    entityId,
    recipientRole,
    metadata = {},
    sendAt,
  } = payload;

  const normalizedRecipients = normalizeRecipients(recipients);

  if (!type) throw new Error("Notification type is required.");
  if (!normalizedRecipients) throw new Error("At least one notification recipient is required.");

  const emailTemplate = renderTemplate(type, variables);
  const scheduledFor = normalizeSendAt(sendAt);
  const now = new Date();
  const status =
    scheduledFor && scheduledFor > now ? NotificationStatus.SCHEDULED : NotificationStatus.PENDING;

  const record = await createOrUpsertNotification({
    userId,
    channel: "EMAIL",
    recipient: normalizedRecipients,
    recipientRole: recipientRole ?? null,
    notificationType: type,
    notificationKey: notificationKey ?? null,
    entityType: entityType ?? null,
    entityId: entityId ?? null,
    payload: {
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html,
    } as Prisma.InputJsonValue,
    metadata: metadata as Prisma.InputJsonValue,
    status,
    sendAt: scheduledFor,
  });

  if (
    record?.status === NotificationStatus.SENT ||
    record?.status === NotificationStatus.CANCELLED
  ) {
    return { skipped: true, notificationId: record.id, status: record.status };
  }

  if (scheduledFor && scheduledFor > now) {
    if (!record) {
      throw new Error("Could not persist scheduled notification for later delivery.");
    }
    console.log(`Notification ${record.id} scheduled for ${scheduledFor.toISOString()}`);
    return { scheduled: true, notificationId: record.id, sendAt: scheduledFor.toISOString() };
  }

  if (!record) {
    throw new Error(
      "Could not persist notification record before sending. Aborting to prevent untracked delivery.",
    );
  }

  return sendStoredNotification(record);
}

// Re-export for consumers that previously imported from emailService
export { cancelNotificationsByEntity as cancelScheduledNotifications } from "./notificationRepository";
