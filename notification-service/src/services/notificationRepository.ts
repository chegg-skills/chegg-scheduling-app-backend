import { NotificationStatus, Prisma, type Notification } from "@prisma/client";
import { prisma } from "../db/prisma";

type NotificationRecordData = Prisma.NotificationUncheckedCreateInput;

export async function createOrUpsertNotification(
  data: NotificationRecordData,
): Promise<Notification | null> {
  try {
    if (data.notificationKey) {
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

      console.log("Notification record upserted:", record.id);
      return record;
    }

    const record = await prisma.notification.create({ data });
    console.log("Notification record created:", record.id);
    return record;
  } catch (error) {
    console.warn(
      "Could not persist notification record in database:",
      error instanceof Error ? error.message : String(error),
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
    console.warn(
      "Could not update notification record after send:",
      error instanceof Error ? error.message : String(error),
    );
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
    console.error("Failed to update notification failure status:", updateError);
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
    console.log(`Cancelled ${result.count} notification(s) for ${entityType}:${entityId}`);
  }

  return result.count;
}
