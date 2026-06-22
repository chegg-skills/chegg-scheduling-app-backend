import { NotificationStatus, Prisma, type Notification } from "@prisma/client";
import { prisma } from "../db/prisma";
import { logger } from "../logger";

type NotificationRecordData = Prisma.NotificationUncheckedCreateInput;

export async function createOrUpsertNotification(
  data: NotificationRecordData,
): Promise<Notification | null> {
  try {
    if (data.notificationKey) {
      // Idempotency: if this notification was already delivered (or cancelled),
      // return it untouched so the caller's skip-if-SENT check fires. The upsert
      // below would otherwise reset `status` back to PENDING on a re-delivery
      // (e.g. an outbox retry), causing a duplicate email to be sent.
      const existing = await prisma.notification.findUnique({
        where: { notificationKey: data.notificationKey },
      });
      if (
        existing &&
        (existing.status === NotificationStatus.SENT ||
          existing.status === NotificationStatus.CANCELLED)
      ) {
        return existing;
      }

      const record = await prisma.notification.upsert({
        where: { notificationKey: data.notificationKey },
        create: data,
        update: {
          userId: data.userId,
          channel: data.channel,
          recipient: data.recipient,
          recipientRole: data.recipientRole ?? null,
          notificationType: data.notificationType,
          entityType: data.entityType ?? null,
          entityId: data.entityId ?? null,
          payload: data.payload,
          metadata: data.metadata ?? Prisma.JsonNull,
          status: data.status,
          sendAt: data.sendAt ?? null,
          error_message: null,
          updatedAt: new Date(),
        },
      });

      logger.debug({ notificationId: record.id }, "Notification record persisted.");
      return record;
    }

    const record = await prisma.notification.create({ data });
    logger.debug({ notificationId: record.id }, "Notification record persisted.");
    return record;
  } catch (error) {
    logger.warn(
      { error, notificationType: data.notificationType },
      "Could not persist notification record.",
    );
    return null;
  }
}

export async function markNotificationAsSent(id: number | null | undefined): Promise<void> {
  if (!id) return;

  try {
    await prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
        lastAttemptAt: new Date(),
        error_message: null,
      },
    });
  } catch (error) {
    logger.warn({ error, notificationId: id }, "Could not update notification record after send.");
  }
}

export async function markNotificationAsFailed(
  id: number | null | undefined,
  error: unknown,
): Promise<void> {
  if (!id) return;

  try {
    await prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.FAILED,
        error_message: error instanceof Error ? error.message : String(error),
        retries: { increment: 1 },
        lastAttemptAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } catch (updateError) {
    logger.error({ error: updateError, notificationId: id }, "Failed to update notification failure status.");
  }
}

export async function findDueScheduledNotifications(limit: number): Promise<Notification[]> {
  return prisma.notification.findMany({
    where: {
      status: { in: [NotificationStatus.SCHEDULED, NotificationStatus.RETRYING] },
      sendAt: { lte: new Date() },
    },
    orderBy: [{ sendAt: "asc" }, { createdAt: "asc" }],
    take: limit,
  });
}

export async function cancelNotificationsByEntity(
  entityType: string,
  entityId: string,
): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      entityType,
      entityId,
      status: {
        in: [NotificationStatus.SCHEDULED, NotificationStatus.PENDING, NotificationStatus.RETRYING],
      },
    },
    data: { status: NotificationStatus.CANCELLED, updatedAt: new Date() },
  });

  if (result.count > 0) {
    logger.info({ count: result.count, entityType, entityId }, "Scheduled notifications cancelled.");
  }

  return result.count;
}
