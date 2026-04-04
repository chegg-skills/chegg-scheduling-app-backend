import { getChannel } from "../dispatcher/channelDispatcher";
import { getRabbitConnection } from "../queues/rabbitmq";
import { cancelScheduledNotifications } from "../services/emailService";
import type {
  CancelScheduledNotificationsInput,
  NotificationPayload,
} from "../types/notification";

async function processNotification(notification: NotificationPayload): Promise<void> {
  if (notification.type === "CANCEL_BOOKING_REMINDERS") {
    if (!notification.entityId) {
      return;
    }

    const cancellationInput: CancelScheduledNotificationsInput = {
      entityType: notification.entityType ?? "BOOKING",
      entityId: notification.entityId,
    };

    await cancelScheduledNotifications(cancellationInput);
    return;
  }

  const channel = getChannel("email");
  if (!channel) {
    throw new Error("No channel found for type: email");
  }

  await channel.send(notification);
}

async function startNotificationConsumer(): Promise<void> {
  try {
    const connection = await getRabbitConnection();
    const channel = await connection.createChannel();

    const exchange = "notificationExchange";
    const queue = "notificationQueue";
    const routingKey = "notification.send";

    const dlqExchange = "notificationExchange.dlq";
    const dlqQueue = "notificationQueue.dlq";
    const dlqRoutingKey = "notification.dlq";

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
      if (!msg) {
        return;
      }

      try {
        console.log(`[${new Date().toISOString()}] Incoming notification message detected on queue: "${queue}"`);
        const notificationPayload = JSON.parse(
          msg.content.toString(),
        ) as NotificationPayload;

        console.log("+-----------------------------------------------------------------+");
        const maskedVariables = {
          ...notificationPayload.variables,
          studentEmail: "***",
          studentName: "***",
        };
        const maskedPayload = {
          ...notificationPayload,
          recipients: typeof notificationPayload.recipients === "string" ? "***" : ["***"],
          variables: maskedVariables,
        };
        console.log("Received notification data:", maskedPayload);
        console.log("+-----------------------------------------------------------------+");

        await processNotification(notificationPayload);
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
