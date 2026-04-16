import type { NotificationPayload } from "../types/notification";

abstract class NotificationChannel {
  abstract send(payload: NotificationPayload): Promise<unknown>;
}

export default NotificationChannel;
