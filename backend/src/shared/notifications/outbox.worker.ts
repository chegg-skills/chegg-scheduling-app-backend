import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { logger } from "../logging/logger";
import { publishNotification, type NotificationPayload } from "./notification.publisher";
import { outboxEmitter } from "./outbox.signal";

/**
 * Transactional-outbox worker.
 *
 * Every notification is enqueued into `OutboxNotification` (by
 * publishNotificationSafely) instead of going straight to RabbitMQ. This worker
 * drains the outbox and publishes each row, retrying on failure — so no
 * notification is silently lost when RabbitMQ is unavailable.
 *
 * Triggered immediately after each enqueue via the shared emitter (happy path),
 * with a fallback poll as a safety net for missed signals (process restart, a
 * worker dying mid-publish).
 */

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;
const LEASE = "5 minutes"; // claim lease: also the retry back-off between attempts
const POLL_INTERVAL_MS = 5 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // hourly
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // delete processed rows older than 30 days

let isRunning = false;

type ClaimedRow = { id: string; payload: NotificationPayload };

/**
 * Atomically claim a batch. A bare `SELECT ... FOR UPDATE SKIP LOCKED` would
 * release its lock when the connection returns to the pool, letting two workers
 * grab the same row. Stamping `claimedAt` inside one statement (with SKIP LOCKED)
 * gives concurrent workers disjoint sets; the lease reclaims rows abandoned by a
 * crashed worker and doubles as the per-attempt back-off.
 */
const claimBatch = async (): Promise<ClaimedRow[]> => {
  return prisma.$queryRaw<ClaimedRow[]>(Prisma.sql`
    UPDATE "OutboxNotification" o
    SET "claimedAt" = now()
    FROM (
      SELECT id FROM "OutboxNotification"
      WHERE "processedAt" IS NULL
        AND "deadLetteredAt" IS NULL
        AND attempts < ${MAX_ATTEMPTS}
        AND ("claimedAt" IS NULL OR "claimedAt" < now() - ${LEASE}::interval)
      ORDER BY "createdAt" ASC
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    ) sub
    WHERE o.id = sub.id
    RETURNING o.id, o.payload;
  `);
};

const markProcessed = (id: string) =>
  prisma.outboxNotification.update({ where: { id }, data: { processedAt: new Date() } });

const recordFailure = async (id: string, error: unknown): Promise<void> => {
  const message = error instanceof Error ? error.message : String(error);
  const { attempts } = await prisma.outboxNotification.update({
    where: { id },
    data: { attempts: { increment: 1 }, lastError: message },
    select: { attempts: true },
  });
  if (attempts >= MAX_ATTEMPTS) {
    await prisma.outboxNotification.update({
      where: { id },
      data: { deadLetteredAt: new Date() },
    });
    logger.error({ outboxId: id, attempts, error: message }, "Outbox notification dead-lettered.");
  }
};

const processRow = async (row: ClaimedRow): Promise<void> => {
  try {
    // Idempotency: a republish of this same row carries the same key, so the
    // notification-service dedups it (no duplicate email). Explicit keys set by
    // the caller take precedence.
    const message: NotificationPayload = {
      ...row.payload,
      notificationKey: row.payload.notificationKey ?? `outbox:${row.id}`,
    };
    const ok = await publishNotification(message); // throws if RabbitMQ is down
    if (ok) {
      await markProcessed(row.id);
    } else {
      await recordFailure(row.id, new Error("publish returned false"));
    }
  } catch (error) {
    await recordFailure(row.id, error).catch((updateError) => {
      logger.error({ outboxId: row.id, updateError }, "Outbox: failed to record failure.");
    });
  }
};

/** Process all currently-claimable rows. Never throws (would crash the process). */
const processOutbox = async (): Promise<void> => {
  if (isRunning) return; // a trigger and the poll can overlap — only one pass at a time
  isRunning = true;
  try {
    // Drain in batches so a backlog (e.g. after an outage) clears in one pass.
    for (;;) {
      const rows = await claimBatch();
      if (rows.length === 0) break;
      for (const row of rows) {
        await processRow(row);
      }
      if (rows.length < BATCH_SIZE) break;
    }
  } catch (error) {
    logger.error({ error }, "Outbox worker pass failed.");
  } finally {
    isRunning = false;
  }
};

const pruneProcessed = async (): Promise<void> => {
  try {
    const cutoff = new Date(Date.now() - RETENTION_MS);
    const { count } = await prisma.outboxNotification.deleteMany({
      where: { processedAt: { lt: cutoff } },
    });
    if (count > 0) {
      logger.info({ count }, "Outbox: pruned old processed rows.");
    }
  } catch (error) {
    logger.error({ error }, "Outbox retention cleanup failed.");
  }
};

/**
 * Attach the listener + start the fallback poll and retention cleanup. Called
 * only from server.ts, so tests (which import `app`, not `server`) never start it
 * and `triggerOutboxProcessing` becomes a harmless no-op. Returns a stop function.
 */
export const startOutboxWorker = (): (() => void) => {
  const onProcess = () => {
    void processOutbox();
  };
  outboxEmitter.on("process", onProcess);

  const pollInterval = setInterval(() => {
    void processOutbox();
  }, POLL_INTERVAL_MS);
  pollInterval.unref?.(); // don't keep the event loop alive for the poll alone

  const cleanupInterval = setInterval(() => {
    void pruneProcessed();
  }, CLEANUP_INTERVAL_MS);
  cleanupInterval.unref?.();

  // Sweep any rows left pending from a previous run/outage on boot.
  void processOutbox();

  logger.info({ pollIntervalMs: POLL_INTERVAL_MS }, "Outbox worker started.");

  return () => {
    clearInterval(pollInterval);
    clearInterval(cleanupInterval);
    outboxEmitter.removeListener("process", onProcess);
    logger.info("Outbox worker stopped.");
  };
};
