import amqp from "amqplib";
import { prisma } from "../db/prisma";
import { logger } from "../logging/logger";

const RABBITMQ_URL = process.env.RABBITMQ_URL ?? "amqp://localhost";
const DELIVERY_EXCHANGE = "notificationExchange";
const DELIVERY_QUEUE = "notificationDeliveryQueue";
const DELIVERY_ROUTING_KEY = "notification.delivery";

interface DeliveryFeedbackMessage {
  type: string;
  notificationKey?: string;
  notificationType?: string;
  status?: "SENT" | "FAILED";
  recipient?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  errorMessage?: string | null;
}

/**
 * Consumes generic delivery results published by the notification-service after it actually
 * sends (or terminally fails) each email, and records them in NotificationDelivery — giving
 * the backend end-to-end delivery visibility for every keyed notification type.
 *
 * Bound to a distinct queue/routing key so it operates independently of the existing
 * STUDENT_CUSTOM_EMAIL feedback consumer.
 */
export async function startNotificationDeliveryConsumer(): Promise<void> {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertExchange(DELIVERY_EXCHANGE, "direct", { durable: true });
    await channel.assertQueue(DELIVERY_QUEUE, { durable: true });
    await channel.bindQueue(DELIVERY_QUEUE, DELIVERY_EXCHANGE, DELIVERY_ROUTING_KEY);

    logger.info({ queue: DELIVERY_QUEUE }, "[DeliveryConsumer] Subscribed and waiting for messages.");

    await channel.consume(DELIVERY_QUEUE, async (msg) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString()) as DeliveryFeedbackMessage;

        if (
          payload.type === "NOTIFICATION_DELIVERY" &&
          payload.notificationKey &&
          payload.notificationType &&
          (payload.status === "SENT" || payload.status === "FAILED")
        ) {
          const deliveredAt = payload.status === "SENT" ? new Date() : null;
          await prisma.notificationDelivery.upsert({
            where: { notificationKey: payload.notificationKey },
            create: {
              notificationKey: payload.notificationKey,
              notificationType: payload.notificationType,
              status: payload.status,
              recipient: payload.recipient ?? null,
              entityType: payload.entityType ?? null,
              entityId: payload.entityId ?? null,
              errorMessage: payload.errorMessage ?? null,
              deliveredAt,
            },
            update: {
              status: payload.status,
              errorMessage: payload.errorMessage ?? null,
              deliveredAt,
            },
          });
        }

        channel.ack(msg);
      } catch (error) {
        logger.error({ error }, "[DeliveryConsumer] Error processing delivery feedback message.");
        // Nack without requeue to avoid an infinite loop on a malformed payload.
        channel.nack(msg, false, false);
      }
    });
  } catch (error) {
    logger.error({ error }, "[DeliveryConsumer] Failed to start delivery feedback consumer.");
  }
}
