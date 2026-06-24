import type amqp from "amqplib";
import { getRabbitConnection } from "../queues/rabbitmq";
import { logger } from "../logger";

const FEEDBACK_EXCHANGE = "notificationExchange";
const FEEDBACK_ROUTING_KEY = "notification.feedback";
// Separate routing key for generic per-notification delivery results (all types), so the
// existing STUDENT_CUSTOM_EMAIL_FEEDBACK consumer on notification.feedback is unaffected.
const DELIVERY_ROUTING_KEY = "notification.delivery";

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

export interface DeliveryFeedback {
  notificationKey: string;
  notificationType: string;
  status: "SENT" | "FAILED";
  recipient?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  errorMessage?: string | null;
}

/**
 * Publish a generic delivery result for any notification type (keyed by notificationKey),
 * so the backend can record end-to-end delivery status. Best-effort — a publish failure is
 * logged and never affects the send path.
 */
export async function publishDeliveryFeedback(feedback: DeliveryFeedback): Promise<boolean> {
  try {
    const channel = await getFeedbackChannel();

    const payload = {
      type: "NOTIFICATION_DELIVERY",
      ...feedback,
      errorMessage: feedback.errorMessage ?? null,
    };

    return channel.publish(
      FEEDBACK_EXCHANGE,
      DELIVERY_ROUTING_KEY,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true, contentType: "application/json" },
    );
  } catch (error) {
    logger.error(
      { error, notificationKey: feedback.notificationKey, status: feedback.status },
      "Failed to publish delivery feedback to RabbitMQ.",
    );
    _channel = null;
    return false;
  }
}
