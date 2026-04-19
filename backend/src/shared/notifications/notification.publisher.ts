import { logger } from "../logging/logger";

type NotificationType =
  | "USER_INVITED"
  | "INVITE_ACCEPTED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_RESCHEDULED"
  | "COACH_BOOKING_ASSIGNED"
  | "COACH_BOOKING_COCOACH_ASSIGNED"
  | "BOOKING_CANCELLED"
  | "BOOKING_NO_SHOW"
  | "COACH_BOOKING_CANCELLED"
  | "COACH_BOOKING_COCOACH_CANCELLED"
  | "COACH_BOOKING_NO_SHOW"
  | "COACH_BOOKING_COCOACH_NO_SHOW"
  | "TEAM_BOOKING_CONFIRMED"
  | "TEAM_BOOKING_CANCELLED"
  | "TEAM_BOOKING_NO_SHOW"
  | "SESSION_REMINDER_24H"
  | "SESSION_REMINDER_1H"
  | "CANCEL_BOOKING_REMINDERS"
  | "TEAM_MEMBER_ADDED"
  | "EVENT_COACH_ADDED"
  | "AVAILABILITY_EXCEPTION_CREATED";

type NotificationPayload = {
  type: NotificationType;
  recipients: string | string[];
  variables?: Record<string, unknown>;
  userId?: string;
  sendAt?: string;
  notificationKey?: string;
  entityType?: string;
  entityId?: string;
  recipientRole?: string;
  metadata?: Record<string, unknown>;
};

const NOTIFICATION_EXCHANGE = process.env.NOTIFICATION_EXCHANGE ?? "notificationExchange";
const NOTIFICATION_ROUTING_KEY = process.env.NOTIFICATION_ROUTING_KEY ?? "notification.send";

let connectionPromise: Promise<any> | null = null;
let channelPromise: Promise<any> | null = null;

const notificationsEnabled = (): boolean => {
  if (process.env.NODE_ENV === "test") {
    return false;
  }

  if (process.env.NOTIFICATIONS_ENABLED === "false") {
    return false;
  }

  return Boolean(process.env.RABBITMQ_URL);
};

const getAmqpModule = () => {
  return require("amqplib");
};

const resetChannelState = () => {
  connectionPromise = null;
  channelPromise = null;
};

const getChannel = async () => {
  if (!channelPromise) {
    channelPromise = (async () => {
      const amqp = getAmqpModule();
      const connection = await amqp.connect(process.env.RABBITMQ_URL);

      connection.on("error", resetChannelState);
      connection.on("close", resetChannelState);

      connectionPromise = Promise.resolve(connection);

      const channel = await connection.createChannel();
      await channel.assertExchange(NOTIFICATION_EXCHANGE, "direct", {
        durable: true,
      });

      return channel;
    })().catch((error: unknown) => {
      resetChannelState();
      throw error;
    });
  }

  return channelPromise;
};

const normalizeRecipients = (recipients: string | string[]): string => {
  if (Array.isArray(recipients)) {
    return recipients.filter(Boolean).join(", ");
  }

  return recipients.trim();
};

const publishNotification = async (payload: NotificationPayload): Promise<boolean> => {
  const recipients = normalizeRecipients(payload.recipients);

  if (!notificationsEnabled() || !recipients) {
    return false;
  }

  const channel = await getChannel();
  const wasPublished = channel.publish(
    NOTIFICATION_EXCHANGE,
    NOTIFICATION_ROUTING_KEY,
    Buffer.from(
      JSON.stringify({
        ...payload,
        recipients,
      }),
    ),
    {
      persistent: true,
      contentType: "application/json",
    },
  );

  return wasPublished;
};

const publishNotificationSafely = async (payload: NotificationPayload): Promise<boolean> => {
  try {
    return await publishNotification(payload);
  } catch (error) {
    logger.error("Failed to publish notification job.", {
      type: payload.type,
      entityType: payload.entityType,
      entityId: payload.entityId,
      error,
    });
    return false;
  }
};
const resolveFrontendUrl = (): string => {
  const rawUrl =
    process.env.FRONTEND_URL ?? process.env.CLIENT_FRONTEND_URL ?? "http://localcoach:5173";

  return rawUrl.replace(/\/$/, "");
};

export { publishNotification, publishNotificationSafely, resolveFrontendUrl };
export type { NotificationPayload, NotificationType };
