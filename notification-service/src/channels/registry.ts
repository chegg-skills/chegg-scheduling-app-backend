import EmailChannel from "./EmailChannel";
import NotificationChannel from "./NotificationChannel";

export type ChannelType = "email";

const registry = new Map<ChannelType, NotificationChannel>([
  ["email", new EmailChannel()],
  // To add SMS: ["sms", new SmsChannel()]
]);

export function getChannel(type: ChannelType): NotificationChannel | undefined {
  return registry.get(type);
}

/**
 * Registers a channel at runtime. Useful for injecting test doubles
 * without module-level mocking.
 */
export function registerChannel(type: ChannelType, channel: NotificationChannel): void {
  registry.set(type, channel);
}
