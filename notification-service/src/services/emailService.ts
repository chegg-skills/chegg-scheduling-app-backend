import "dotenv/config";
import { NotificationStatus, Prisma, type Notification } from "@prisma/client";
import nodemailer from "nodemailer";
import { prisma } from "../db/prisma";
import emailTemplatesHelper from "../utils/helper/emailTemplatesHelper";
import type { CancelScheduledNotificationsInput, NotificationPayload } from "../types/notification";

type Transporter = ReturnType<typeof nodemailer.createTransport>;
type SendMailOptions = Parameters<Transporter["sendMail"]>[0];
type SentMessageInfo = Awaited<ReturnType<Transporter["sendMail"]>>;

const MAX_RETRIES = Number(process.env.EMAIL_MAX_RETRIES ?? 3);
const RETRY_DELAY_MS = Number(process.env.EMAIL_RETRY_DELAY_MS ?? 3000);
const MAX_SCHEDULED_BATCH_SIZE = Number(process.env.REMINDER_BATCH_SIZE ?? 25);
const DEFAULT_FROM_EMAIL =
  process.env.EMAIL_FROM ??
  process.env.SMTP_USER ??
  process.env.EMAIL_USERNAME ??
  "no-reply@example.com";

type NotificationRecordData = Prisma.NotificationUncheckedCreateInput;
type NotificationMailContent = {
  subject?: string;
  text?: string;
  html?: string;
};

type NotificationSendResult =
  | SentMessageInfo
  | { skipped: true; notificationId: number; status: NotificationStatus }
  | { scheduled: true; notificationId: number; sendAt: string }
  | null;

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const buildTransporter = (): Transporter => {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    });
  }

  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE ?? "gmail",
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

const transporter = buildTransporter();

const normalizeRecipients = (recipients: string | string[]): string => {
  if (Array.isArray(recipients)) {
    return recipients.filter(Boolean).join(", ");
  }

  return String(recipients ?? "").trim();
};

const normalizeSendAt = (value?: string | Date | null): Date | null => {
  if (!value) {
    return null;
  }

  const parsedValue = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsedValue.getTime()) ? null : parsedValue;
};

const sendEmailWithRetry = async (
  mailOptions: SendMailOptions,
  maxRetries = MAX_RETRIES,
): Promise<SentMessageInfo> => {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      return await transporter.sendMail(mailOptions);
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        break;
      }

      await wait(RETRY_DELAY_MS);
    }
  }

  const errorMessage = lastError instanceof Error ? lastError.message : "Unknown error";

  throw new Error(`Failed to send email after ${maxRetries} attempts: ${errorMessage}`);
};

const createNotificationRecord = async (
  notificationData: NotificationRecordData,
): Promise<Notification | null> => {
  try {
    if (notificationData.notificationKey) {
      const existingRecord = await prisma.notification.findUnique({
        where: { notificationKey: notificationData.notificationKey },
      });

      if (
        existingRecord?.status === NotificationStatus.SENT ||
        existingRecord?.status === NotificationStatus.CANCELLED
      ) {
        return existingRecord;
      }

      if (existingRecord) {
        return prisma.notification.update({
          where: { id: existingRecord.id },
          data: {
            userId: notificationData.userId,
            channel: notificationData.channel,
            recipient: notificationData.recipient,
            recipientRole: notificationData.recipientRole ?? null,
            notificationType: notificationData.notificationType,
            entityType: notificationData.entityType ?? null,
            entityId: notificationData.entityId ?? null,
            payload: notificationData.payload,
            metadata: notificationData.metadata ?? Prisma.JsonNull,
            status: notificationData.status,
            sendAt: notificationData.sendAt ?? null,
            error_message: null,
            updatedAt: new Date(),
          },
        });
      }
    }

    const record = await prisma.notification.create({ data: notificationData });
    console.log("Notification record created:", record.id);
    return record;
  } catch (error) {
    console.warn(
      "Could not persist notification record in database:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
};

const getMailContent = (payload: Prisma.JsonValue): NotificationMailContent => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  return payload as NotificationMailContent;
};

const buildMailOptions = (
  notificationRecord: Pick<Notification, "recipient" | "payload">,
): SendMailOptions => {
  const payload = getMailContent(notificationRecord.payload);

  return {
    from: DEFAULT_FROM_EMAIL,
    to: notificationRecord.recipient,
    subject: String(payload.subject ?? ""),
    text: String(payload.text ?? ""),
    html: String(payload.html ?? ""),
  };
};

const markNotificationAsSent = async (notificationId?: number | null): Promise<void> => {
  if (!notificationId) {
    return;
  }

  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
        lastAttemptAt: new Date(),
        error_message: null,
      },
    });
  } catch (error) {
    console.warn(
      "Could not update notification record after send:",
      error instanceof Error ? error.message : String(error),
    );
  }
};

const markNotificationAsFailed = async (
  notificationId: number | null | undefined,
  error: unknown,
): Promise<void> => {
  if (!notificationId) {
    return;
  }

  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.FAILED,
        error_message: error instanceof Error ? error.message : String(error),
        retries: { increment: 1 },
        lastAttemptAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } catch (updateError) {
    console.error("Failed to update notification status:", updateError);
  }
};

const sendStoredNotification = async (
  notificationRecord: Notification | null,
): Promise<NotificationSendResult> => {
  if (!notificationRecord) {
    return null;
  }

  if (
    notificationRecord.status === NotificationStatus.SENT ||
    notificationRecord.status === NotificationStatus.CANCELLED
  ) {
    return {
      skipped: true,
      notificationId: notificationRecord.id,
      status: notificationRecord.status,
    };
  }

  try {
    const info = await sendEmailWithRetry(buildMailOptions(notificationRecord));

    console.log("Email sent successfully:", info.messageId ?? info.response ?? info);
    await markNotificationAsSent(notificationRecord.id);

    return info;
  } catch (error) {
    await markNotificationAsFailed(notificationRecord.id, error);
    console.error("Error sending notification:", error);
    throw error;
  }
};

async function sendNotification(
  notificationPayload: NotificationPayload,
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
  } = notificationPayload;

  const normalizedRecipients = normalizeRecipients(recipients);
  const scheduledFor = normalizeSendAt(sendAt);

  if (!type) {
    throw new Error("Notification type is required.");
  }

  if (!normalizedRecipients) {
    throw new Error("At least one notification recipient is required.");
  }

  const emailTemplate = emailTemplatesHelper(type, variables);
  const now = new Date();
  const notificationStatus =
    scheduledFor && scheduledFor > now ? NotificationStatus.SCHEDULED : NotificationStatus.PENDING;

  const notificationRecord = await createNotificationRecord({
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
    status: notificationStatus,
    sendAt: scheduledFor,
  });

  if (
    notificationRecord?.status === NotificationStatus.SENT ||
    notificationRecord?.status === NotificationStatus.CANCELLED
  ) {
    return {
      skipped: true,
      notificationId: notificationRecord.id,
      status: notificationRecord.status,
    };
  }

  if (scheduledFor && scheduledFor > now) {
    if (!notificationRecord) {
      throw new Error("Could not persist scheduled notification for later delivery.");
    }

    console.log(
      `Notification ${notificationRecord.id} scheduled for ${scheduledFor.toISOString()}`,
    );

    return {
      scheduled: true,
      notificationId: notificationRecord.id,
      sendAt: scheduledFor.toISOString(),
    };
  }

  if (!notificationRecord) {
    const info = await sendEmailWithRetry({
      from: DEFAULT_FROM_EMAIL,
      to: normalizedRecipients,
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html,
    });

    console.log("Email sent successfully:", info.messageId ?? info.response ?? info);
    return info;
  }

  return sendStoredNotification(notificationRecord);
}

async function processScheduledNotifications(limit = MAX_SCHEDULED_BATCH_SIZE): Promise<number> {
  const dueNotifications = await prisma.notification.findMany({
    where: {
      status: {
        in: [NotificationStatus.SCHEDULED, NotificationStatus.RETRYING],
      },
      sendAt: {
        lte: new Date(),
      },
    },
    orderBy: [{ sendAt: "asc" }, { createdAt: "asc" }],
    take: limit,
  });

  for (const notificationRecord of dueNotifications) {
    await sendStoredNotification(notificationRecord);
  }

  return dueNotifications.length;
}

async function cancelScheduledNotifications(
  input: CancelScheduledNotificationsInput,
): Promise<number> {
  const { entityType, entityId } = input;

  const result = await prisma.notification.updateMany({
    where: {
      entityType,
      entityId,
      status: {
        in: [NotificationStatus.SCHEDULED, NotificationStatus.PENDING, NotificationStatus.RETRYING],
      },
    },
    data: {
      status: NotificationStatus.CANCELLED,
      updatedAt: new Date(),
    },
  });

  if (result.count > 0) {
    console.log(
      `Cancelled ${result.count} scheduled notification(s) for ${entityType}:${entityId}`,
    );
  }

  return result.count;
}

export { sendNotification, processScheduledNotifications, cancelScheduledNotifications };
