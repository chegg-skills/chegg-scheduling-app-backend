import NotificationChannel from "./NotificationChannel";
import { sendNotification } from "../services/emailService";
import type { NotificationPayload } from "../types/notification";

class EmailChannel extends NotificationChannel {
  async send(payload: NotificationPayload): Promise<unknown> {
    return sendNotification(payload);
  }
}

export default EmailChannel;
