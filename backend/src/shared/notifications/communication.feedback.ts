import amqp from "amqplib";
import { prisma } from "../db/prisma";
import { CommunicationStatus } from "@prisma/client";
import { logger } from "../logging/logger";

const RABBITMQ_URL = process.env.RABBITMQ_URL ?? "amqp://localhost";
const FEEDBACK_EXCHANGE = "notificationExchange";
const FEEDBACK_QUEUE = "notificationResponseQueue";
const FEEDBACK_ROUTING_KEY = "notification.feedback";
const MAX_RECONNECT_DELAY_MS = 30_000;

async function connectFeedbackConsumer(attempt: number): Promise<void> {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);

    connection.on("close", () => {
      logger.warn("[FeedbackConsumer] Connection closed — scheduling reconnect.");
      scheduleReconnect(attempt + 1);
    });

    connection.on("error", (err) => {
      logger.error({ error: err }, "[FeedbackConsumer] Connection error.");
    });

    const channel = await connection.createChannel();

    await channel.assertExchange(FEEDBACK_EXCHANGE, "direct", { durable: true });
    await channel.assertQueue(FEEDBACK_QUEUE, { durable: true });
    await channel.bindQueue(FEEDBACK_QUEUE, FEEDBACK_EXCHANGE, FEEDBACK_ROUTING_KEY);

    logger.info({ queue: FEEDBACK_QUEUE }, "[FeedbackConsumer] Subscribed and waiting for messages.");

    await channel.consume(FEEDBACK_QUEUE, async (msg) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString());
        logger.info(payload, "[FeedbackConsumer] Received delivery feedback.");

        if (payload.type === "STUDENT_CUSTOM_EMAIL_FEEDBACK" && payload.communicationLogId) {
          const { communicationLogId, status, errorMessage } = payload;

          await prisma.studentCommunicationLog.update({
            where: { id: communicationLogId },
            data: {
              status: status === "SENT" ? CommunicationStatus.SENT : CommunicationStatus.FAILED,
              errorMessage: errorMessage ?? null,
            },
          });

          logger.info(
            { status, communicationLogId },
            "[FeedbackConsumer] Successfully updated database status.",
          );
        }

        channel.ack(msg);
      } catch (error) {
        logger.error({ error }, "[FeedbackConsumer] Error processing feedback message.");
        // Nack but do not requeue to avoid infinite loop on malformed payloads
        channel.nack(msg, false, false);
      }
    });
  } catch (error) {
    logger.error({ error, attempt }, "[FeedbackConsumer] Failed to connect — scheduling reconnect.");
    scheduleReconnect(attempt + 1);
  }
}

function scheduleReconnect(attempt: number): void {
  const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), MAX_RECONNECT_DELAY_MS);
  logger.info({ delayMs, attempt }, "[FeedbackConsumer] Reconnecting.");
  setTimeout(() => connectFeedbackConsumer(attempt).catch(() => {}), delayMs);
}

export async function startFeedbackConsumer(): Promise<void> {
  // Prevent starting consumer in test environments to avoid blocking test runs
  if (process.env.NODE_ENV === "test") {
    return;
  }

  await connectFeedbackConsumer(0);
}
