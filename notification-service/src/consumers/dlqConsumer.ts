import { QUEUE_CONFIG } from "../config/queues";
import { getRabbitConnection } from "../queues/rabbitmq";
import type { NotificationPayload } from "../types/notification";
import { processNotification } from "./processNotification";

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

    console.log("Waiting for messages in DLQ:", dlqQueue);

    channel.consume(dlqQueue, async (msg: Parameters<typeof channel.ack>[0] | null) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString()) as NotificationPayload;

        console.log("+-----------------------------------------------------------------+");
        console.log("Received notification from DLQ:", {
          ...payload,
          recipients: typeof payload.recipients === "string" ? "***" : ["***"],
          variables: { ...payload.variables, studentEmail: "***", studentName: "***" },
        });
        console.log("+-----------------------------------------------------------------+");

        await processNotification(payload);
        channel.ack(msg);
      } catch (error) {
        console.error("Failed to process notification from DLQ:", error);
        channel.nack(msg, false, false);
      }
    });
  } catch (error) {
    console.error("Error starting DLQ consumer:", error);
    throw new Error("Failed to start DLQ consumer");
  }
}

export { startDLQConsumer };
