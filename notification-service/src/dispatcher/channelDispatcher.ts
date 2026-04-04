import EmailChannel from "../channel/EmailChannel";
import type NotificationChannel from "../channel/NotificationChannel";

export type ChannelType = "email";

const channels: Record<ChannelType, NotificationChannel> = {
  email: new EmailChannel(),
};

const getChannel = (type: ChannelType): NotificationChannel | undefined => {
  return channels[type];
};

export { getChannel };
