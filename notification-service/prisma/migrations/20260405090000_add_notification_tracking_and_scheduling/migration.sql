-- Add new notification statuses for reminder scheduling and cancellation
ALTER TYPE "public"."NotificationStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED';
ALTER TYPE "public"."NotificationStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- Add tracking fields to support scheduled reminders and better observability
ALTER TABLE "public"."Notification"
  ADD COLUMN IF NOT EXISTS "recipientRole" TEXT,
  ADD COLUMN IF NOT EXISTS "notificationKey" TEXT,
  ADD COLUMN IF NOT EXISTS "entityType" TEXT,
  ADD COLUMN IF NOT EXISTS "entityId" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "sendAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastAttemptAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Notification_notificationKey_key"
  ON "public"."Notification"("notificationKey");

CREATE INDEX IF NOT EXISTS "Notification_status_sendAt_idx"
  ON "public"."Notification"("status", "sendAt");

CREATE INDEX IF NOT EXISTS "Notification_entityType_entityId_idx"
  ON "public"."Notification"("entityType", "entityId");