import amqp from "amqplib";
import { prisma } from "../db/prisma";
import { CommunicationStatus } from "@prisma/client";
import { logger } from "../logging/logger";

const RABBITMQ_URL = process.env.RABBITMQ_URL ?? "amqp://localhost";
const FEEDBACK_EXCHANGE = "notificationExchange";
const FEEDBACK_QUEUE = "notificationResponseQueue";
const FEEDBACK_ROUTING_KEY = "notification.feedback";

export async function startFeedbackConsumer(): Promise<void> {
  // Prevent starting consumer in test environments to avoid blocking test runs
  if (process.env.NODE_ENV === "test") {
    return;
  }

  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertExchange(FEEDBACK_EXCHANGE, "direct", {
      durable: true,
    });

    await channel.assertQueue(FEEDBACK_QUEUE, {
      durable: true,
    });

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
    logger.error({ error }, "[FeedbackConsumer] Failed to start feedback consumer.");
  }
}
