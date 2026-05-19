export type TemplateValue = string | number | boolean | null | undefined;

export type TemplateVariables = Record<string, TemplateValue>;

export type NotificationMetadata = Record<string, unknown>;

export type NotificationType =
  | "USER_INVITED"
  | "INVITE_ACCEPTED"
  | "TEAM_MEMBER_ADDED"
  | "EVENT_HOST_ADDED"
  | "AVAILABILITY_EXCEPTION_CREATED"
  | "AVAILABILITY_EXCEPTION_REMOVED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CONFIRMED_DEFERRED"
  | "BOOKING_RESCHEDULED"
  | "BOOKING_CANCELLED"
  | "BOOKING_CANCELLED_DEFERRED"
  | "BOOKING_NO_SHOW"
  | "COACH_BOOKING_ASSIGNED"
  | "COACH_BOOKING_COHOST_ASSIGNED"
  | "COACH_BOOKING_CANCELLED"
  | "COACH_BOOKING_COHOST_CANCELLED"
  | "COACH_BOOKING_NO_SHOW"
  | "COACH_BOOKING_COHOST_NO_SHOW"
  | "TEAM_BOOKING_CONFIRMED"
  | "TEAM_BOOKING_CANCELLED"
  | "TEAM_BOOKING_NO_SHOW"
  | "SESSION_REMINDER_24H"
  | "SESSION_REMINDER_12H"
  | "SESSION_REMINDER_6H"
  | "SESSION_REMINDER_1H"
  | "CANCEL_BOOKING_REMINDERS"
  | "COACH_REVEAL_SENT"
  | "ZOOM_ISV_LINK_EXPIRY_REMINDER"
  | "EVENT_ACTIVATED"
  | "EVENT_DEACTIVATED";

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
