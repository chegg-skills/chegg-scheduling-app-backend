import { QUEUE_CONFIG } from "../config/queues";
import { getRabbitConnection } from "../queues/rabbitmq";
import type { NotificationPayload } from "../types/notification";
import { processNotification } from "./processNotification";

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

    console.log("Waiting for messages in queue:", queue);

    channel.consume(queue, async (msg: Parameters<typeof channel.ack>[0] | null) => {
      if (!msg) return;

      try {
        console.log(
          `[${new Date().toISOString()}] Incoming notification message detected on queue: "${queue}"`,
        );
        const payload = JSON.parse(msg.content.toString()) as NotificationPayload;

        console.log("+-----------------------------------------------------------------+");
        console.log("Received notification data:", {
          ...payload,
          recipients: typeof payload.recipients === "string" ? "***" : ["***"],
          variables: { ...payload.variables, studentEmail: "***", studentName: "***" },
        });
        console.log("+-----------------------------------------------------------------+");

        await processNotification(payload);
        channel.ack(msg);
      } catch (error) {
        console.error("Failed to process notification job:", error);
        channel.nack(msg, false, false);
      }
    });
  } catch (error) {
    console.error("Error starting notification consumer:", error);
    throw new Error("Failed to start notification consumer");
  }
}

export { startNotificationConsumer };
