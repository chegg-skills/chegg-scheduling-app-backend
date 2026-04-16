import type { NotificationPayload } from "../types/notification";
import { sendNotification } from "../services/notificationService";
import NotificationChannel from "./NotificationChannel";

class EmailChannel extends NotificationChannel {
  async send(payload: NotificationPayload): Promise<unknown> {
    return sendNotification(payload);
  }
}

export default EmailChannel;
