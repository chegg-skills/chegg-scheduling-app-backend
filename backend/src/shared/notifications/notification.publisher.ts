import { logger } from "../logging/logger";

type NotificationType =
  | "USER_INVITED"
  | "INVITE_ACCEPTED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CONFIRMED_DEFERRED"
  | "BOOKING_RESCHEDULED"
  | "COACH_BOOKING_ASSIGNED"
  | "COACH_BOOKING_COCOACH_ASSIGNED"
  | "BOOKING_CANCELLED"
  | "BOOKING_CANCELLED_DEFERRED"
  | "BOOKING_NO_SHOW"
  | "COACH_BOOKING_CANCELLED"
  | "COACH_BOOKING_COCOACH_CANCELLED"
  | "COACH_BOOKING_NO_SHOW"
  | "COACH_BOOKING_COCOACH_NO_SHOW"
  | "TEAM_BOOKING_CONFIRMED"
  | "TEAM_BOOKING_CANCELLED"
  | "TEAM_BOOKING_NO_SHOW"
  | "SESSION_REMINDER_24H"
  | "SESSION_REMINDER_12H"
  | "SESSION_REMINDER_6H"
  | "SESSION_REMINDER_1H"
  | "CANCEL_BOOKING_REMINDERS"
  | "TEAM_MEMBER_ADDED"
  | "EVENT_COACH_ADDED"
  | "AVAILABILITY_EXCEPTION_CREATED"
  | "AVAILABILITY_EXCEPTION_REMOVED"
  | "COACH_REVEAL_SENT"
  | "ZOOM_ISV_LINK_EXPIRY_REMINDER"
  | "EVENT_LOCATION_LINK_EXPIRY_REMINDER"
  | "CANCEL_EVENT_LINK_EXPIRY_REMINDER"
  | "EVENT_ACTIVATED"
  | "EVENT_DEACTIVATED"
  | "STUDENT_CUSTOM_EMAIL"
  | "STUDENT_SESSION_FEEDBACK"
  | "BOOKING_CONFIRMED_ANONYMOUS"
  | "BOOKING_CANCELLED_ANONYMOUS"
  | "SESSION_REMINDER_ANONYMOUS_24H"
  | "SESSION_REMINDER_ANONYMOUS_12H"
  | "SESSION_REMINDER_ANONYMOUS_6H"
  | "SESSION_REMINDER_ANONYMOUS_1H"
  | "ANONYMOUS_BOOKING_POOL_REMINDER"
  | "ANONYMOUS_SLOT_CANCELLED_POOL";

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

// Control messages carry no recipients — they instruct the notification-service to
// cancel previously-scheduled notifications rather than send a new one.
const CONTROL_MESSAGE_TYPES = new Set<NotificationType>([
  "CANCEL_BOOKING_REMINDERS",
  "CANCEL_EVENT_LINK_EXPIRY_REMINDER",
]);

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

export type DependencyStatus = "ok" | "skipped" | "down";

/**
 * Readiness probe for RabbitMQ. Returns "skipped" when notifications are not a
 * required dependency in this configuration (test / NOTIFICATIONS_ENABLED=false /
 * no RABBITMQ_URL), "ok" when a channel can be established, "down" otherwise.
 */
export const checkRabbitHealthy = async (timeoutMs = 2000): Promise<DependencyStatus> => {
  if (!notificationsEnabled()) {
    return "skipped";
  }

  try {
    await Promise.race([
      getChannel(),
      new Promise((_resolve, reject) =>
        setTimeout(() => reject(new Error("rabbitmq health check timed out")), timeoutMs),
      ),
    ]);
    return "ok";
  } catch {
    return "down";
  }
};

const normalizeRecipients = (recipients: string | string[]): string => {
  if (Array.isArray(recipients)) {
    return recipients.filter(Boolean).join(", ");
  }

  return recipients.trim();
};

const publishNotification = async (payload: NotificationPayload): Promise<boolean> => {
  const recipients = normalizeRecipients(payload.recipients);
  const isControlMessage = CONTROL_MESSAGE_TYPES.has(payload.type);

  if (!notificationsEnabled() || (!recipients && !isControlMessage)) {
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
    logger.error(
      { type: payload.type, entityType: payload.entityType, entityId: payload.entityId, error },
      "Failed to publish notification job.",
    );
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
