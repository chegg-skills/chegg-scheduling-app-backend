export type TemplateValue = string | number | boolean | null | undefined;

export type TemplateVariables = Record<string, TemplateValue>;

export type NotificationMetadata = Record<string, unknown>;

export type NotificationPayload = {
  type: string;
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
  attachmentRequired?: boolean;
};

export type EmailTemplateMap = Record<string, EmailTemplate>;

export type CancelScheduledNotificationsInput = {
  entityType: string;
  entityId: string;
};
