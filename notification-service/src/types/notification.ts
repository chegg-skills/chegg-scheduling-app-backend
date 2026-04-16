export type TemplateValue = string | number | boolean | null | undefined;

export type TemplateVariables = Record<string, TemplateValue>;

export type NotificationMetadata = Record<string, unknown>;

export type NotificationType =
  | "USER_INVITED"
  | "INVITE_ACCEPTED"
  | "TEAM_MEMBER_ADDED"
  | "EVENT_HOST_ADDED"
  | "AVAILABILITY_EXCEPTION_CREATED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_RESCHEDULED"
  | "BOOKING_CANCELLED"
  | "BOOKING_NO_SHOW"
  | "COACH_BOOKING_ASSIGNED"
  | "COACH_BOOKING_COHOST_ASSIGNED"
  | "COACH_BOOKING_CANCELLED"
  | "COACH_BOOKING_COHOST_CANCELLED"
  | "COACH_BOOKING_COHOST_NO_SHOW"
  | "TEAM_BOOKING_CONFIRMED"
  | "SESSION_REMINDER_24H"
  | "SESSION_REMINDER_1H"
  | "CANCEL_BOOKING_REMINDERS";

export type NotificationPayload = {
  type: NotificationType;
  recipients: string | string[];
  variables?: TemplateVariables;
  userId?: string;
  notificationKey?: string;
  entityType?: string;
  entityId?: string;
  recipientRole?: string;
  metadata?: NotificationMetadata;
  sendAt?: string | Date;
};

export type EmailTemplate = {
  subject: string;
  text: string;
  html: string;
  preheader?: string;
};

export type EmailTemplateMap = Record<string, EmailTemplate>;

export type CancelScheduledNotificationsInput = {
  entityType: string;
  entityId: string;
};
