import * as Sentry from "@sentry/node";
import { NotificationStatus, Prisma, type Notification } from "@prisma/client";
import { prisma } from "../db/prisma";
import { logger } from "../logger";

type NotificationRecordData = Prisma.NotificationUncheckedCreateInput;

// How many times the scheduler will retry a transiently-failing send before giving up.
export const MAX_SCHEDULER_ATTEMPTS = Number(process.env.NOTIFICATION_MAX_ATTEMPTS ?? 5);
// Linear backoff base — nth retry waits n * this many ms.
const RETRY_BACKOFF_MS = Number(process.env.NOTIFICATION_RETRY_BACKOFF_MS ?? 60_000);
// A claimed (SENDING) row older than this is assumed orphaned by a crashed instance.
const SEND_LEASE_MS = Number(process.env.NOTIFICATION_SEND_LEASE_MS ?? 5 * 60_000);

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
    Sentry.captureException(error);
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
    Sentry.captureException(error);
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
    Sentry.captureException(updateError);
  }
}

/**
 * Atomically claim due scheduled/retrying rows by flipping them to SENDING in a single
 * `FOR UPDATE SKIP LOCKED` statement, so concurrent notification-service instances never
 * select and send the same reminder twice. Mirrors the backend outbox worker's claim.
 */
export async function claimDueScheduledNotifications(limit: number): Promise<Notification[]> {
  // "sendAt"/"lastAttemptAt" are naive (timestamp without time zone) columns storing UTC
  // wall-clock values. Bare now() is timestamptz and gets implicitly cast using the
  // session's TIMEZONE setting, which silently shifts it off UTC on any non-UTC server —
  // `now() AT TIME ZONE 'UTC'` forces the cast to the same UTC convention the column uses.
  return prisma.$queryRaw<Notification[]>(Prisma.sql`
    UPDATE "Notification"
    SET status = 'SENDING'::"NotificationStatus", "lastAttemptAt" = (now() AT TIME ZONE 'UTC')
    WHERE id IN (
      SELECT id FROM "Notification"
      WHERE status IN ('SCHEDULED', 'RETRYING')
        AND "sendAt" <= (now() AT TIME ZONE 'UTC')
      ORDER BY "sendAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
  `);
}

/**
 * Recover rows left in SENDING by a crashed/restarted instance: once the lease elapses,
 * return them to RETRYING (due immediately) so another instance can pick them up.
 */
export async function reclaimStaleSendingNotifications(): Promise<number> {
  const cutoff = new Date(Date.now() - SEND_LEASE_MS);
  const count = await prisma.$executeRaw(Prisma.sql`
    UPDATE "Notification"
    SET status = 'RETRYING'::"NotificationStatus", "sendAt" = (now() AT TIME ZONE 'UTC'), "updatedAt" = (now() AT TIME ZONE 'UTC')
    WHERE status = 'SENDING'::"NotificationStatus"
      AND "lastAttemptAt" < ${cutoff}
  `);
  if (count > 0) {
    logger.warn({ count }, "Reclaimed stale SENDING notifications back to RETRYING.");
  }
  return count;
}

/**
 * Schedule a transiently-failed notification for a later retry (picked up by the next
 * sweep once `sendAt` passes), with linear backoff. Used only on the scheduler path —
 * the immediate/consumer path continues to rely on the RabbitMQ DLQ.
 */
export async function markNotificationForRetry(
  record: Notification,
  error: unknown,
): Promise<void> {
  const nextRetries = record.retries + 1;
  const backoffMs = RETRY_BACKOFF_MS * nextRetries;
  await prisma.notification.update({
    where: { id: record.id },
    data: {
      status: NotificationStatus.RETRYING,
      retries: nextRetries,
      sendAt: new Date(Date.now() + backoffMs),
      error_message: error instanceof Error ? error.message : String(error),
      lastAttemptAt: new Date(),
      updatedAt: new Date(),
    },
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
