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

async function startDLQConsumer(): Promise<void> {
  try {
    const connection = await getRabbitConnection();
    const channel = await connection.createChannel();
    const dlq = "notificationQueue.dlq";
    const dlqExchange = "notificationExchange.dlq";
    const dlqRoutingKey = "notification.dlq";

    await channel.assertExchange(dlqExchange, "direct", { durable: true });
    await channel.assertQueue(dlq, { durable: true });
    await channel.bindQueue(dlq, dlqExchange, dlqRoutingKey);

    console.log("Waiting for messages in DLQ:", dlq);

    channel.consume(dlq, async (msg: Parameters<typeof channel.ack>[0] | null) => {
      if (!msg) {
        return;
      }

      try {
        const notificationPayload = JSON.parse(
          msg.content.toString(),
        ) as NotificationPayload;

        console.log("+-----------------------------------------------------------------+");
        console.log("Received notification from DLQ:", notificationPayload);
        console.log("+-----------------------------------------------------------------+");

        await processNotification(notificationPayload);
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
