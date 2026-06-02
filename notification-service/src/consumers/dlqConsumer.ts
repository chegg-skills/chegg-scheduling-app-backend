import { QUEUE_CONFIG } from "../config/queues";
import { getRabbitConnection } from "../queues/rabbitmq";
import type { NotificationPayload } from "../types/notification";
import { processNotification } from "./processNotification";
import { logger } from "../logger";

const PREFETCH_COUNT = Number(process.env.RABBITMQ_PREFETCH ?? 10);

async function startDLQConsumer(): Promise<void> {
  try {
    const connection = await getRabbitConnection();
    const channel = await connection.createChannel();

    await channel.prefetch(PREFETCH_COUNT);

    const { dlqExchange, dlqQueue, dlqRoutingKey } = QUEUE_CONFIG;

    await channel.assertExchange(dlqExchange, "direct", { durable: true });
    await channel.assertQueue(dlqQueue, { durable: true });
    await channel.bindQueue(dlqQueue, dlqExchange, dlqRoutingKey);

    logger.info({ queue: dlqQueue }, "[DLQConsumer] Subscribed and waiting for messages.");

    channel.consume(dlqQueue, async (msg: Parameters<typeof channel.ack>[0] | null) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString()) as NotificationPayload;

        logger.warn(
          {
            type: payload.type,
            entityId: payload.entityId,
            recipientEmail: typeof payload.recipients === "string" ? "***" : ["***"],
          },
          "DLQ message received.",
        );

        await processNotification(payload);
        channel.ack(msg);
      } catch (error) {
        logger.error({ error }, "Failed to process DLQ notification.");
        channel.nack(msg, false, false);
      }
    });
  } catch (error) {
    logger.error({ error }, "Error starting DLQ consumer.");
    throw new Error("Failed to start DLQ consumer");
  }
}

export { startDLQConsumer };
