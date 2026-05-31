import { QUEUE_CONFIG } from "../config/queues";
import { getRabbitConnection } from "../queues/rabbitmq";
import type { NotificationPayload } from "../types/notification";
import { processNotification } from "./processNotification";
import { logger } from "../logger";

const PREFETCH_COUNT = Number(process.env.RABBITMQ_PREFETCH ?? 10);

async function startNotificationConsumer(): Promise<void> {
  try {
    const connection = await getRabbitConnection();
    const channel = await connection.createChannel();

    await channel.prefetch(PREFETCH_COUNT);

    const { exchange, queue, routingKey, dlqExchange, dlqQueue, dlqRoutingKey } = QUEUE_CONFIG;

    await channel.assertExchange(exchange, "direct", { durable: true });
    await channel.assertQueue(queue, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": dlqExchange,
        "x-dead-letter-routing-key": dlqRoutingKey,
      },
    });
    await channel.bindQueue(queue, exchange, routingKey);

    await channel.assertExchange(dlqExchange, "direct", { durable: true });
    await channel.assertQueue(dlqQueue, { durable: true });
    await channel.bindQueue(dlqQueue, dlqExchange, dlqRoutingKey);

    logger.info({ queue }, "[NotificationConsumer] Subscribed and waiting for messages.");

    channel.consume(queue, async (msg: Parameters<typeof channel.ack>[0] | null) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString()) as NotificationPayload;

        logger.info(
          {
            type: payload.type,
            entityId: payload.entityId,
            recipientEmail: typeof payload.recipients === "string" ? "***" : ["***"],
          },
          "Notification message received.",
        );

        await processNotification(payload);
        channel.ack(msg);
      } catch (error) {
        logger.error({ error }, "Failed to process notification job.");
        channel.nack(msg, false, false);
      }
    });
  } catch (error) {
    logger.error({ error }, "Error starting notification consumer.");
    throw new Error("Failed to start notification consumer");
  }
}

export { startNotificationConsumer };
