import type amqp from "amqplib";
import { getRabbitConnection } from "../queues/rabbitmq";
import { logger } from "../logger";

const FEEDBACK_EXCHANGE = "notificationExchange";
const FEEDBACK_ROUTING_KEY = "notification.feedback";

// Singleton channel — created once and reused to avoid AMQP channel churn
let _channel: amqp.Channel | null = null;

async function getFeedbackChannel(): Promise<amqp.Channel> {
  if (_channel) return _channel;

  const connection = await getRabbitConnection();
  _channel = await connection.createChannel();

  await _channel.assertExchange(FEEDBACK_EXCHANGE, "direct", { durable: true });

  // Reset on error/close so we re-create on the next call
  _channel.on("error", () => {
    _channel = null;
  });
  _channel.on("close", () => {
    _channel = null;
  });

  return _channel;
}

export async function publishFeedback(
  logId: string,
  status: "SENT" | "FAILED",
  errorMessage?: string | null,
): Promise<boolean> {
  try {
    const channel = await getFeedbackChannel();

    const payload = {
      type: "STUDENT_CUSTOM_EMAIL_FEEDBACK",
      communicationLogId: logId,
      status,
      errorMessage: errorMessage ?? null,
    };

    logger.debug({ logId, status }, "[FeedbackPublisher] Publishing status.");

    return channel.publish(
      FEEDBACK_EXCHANGE,
      FEEDBACK_ROUTING_KEY,
      Buffer.from(JSON.stringify(payload)),
      {
        persistent: true,
        contentType: "application/json",
      },
    );
  } catch (error) {
    logger.error({ error, logId, status }, "Failed to publish email feedback status to RabbitMQ.");
    // Reset channel so the next attempt gets a fresh one
    _channel = null;
    return false;
  }
}
