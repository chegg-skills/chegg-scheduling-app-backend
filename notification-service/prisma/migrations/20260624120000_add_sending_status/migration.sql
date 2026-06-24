-- Add a transient SENDING state so the reminder scheduler can atomically claim
-- due rows (FOR UPDATE SKIP LOCKED) before sending, making it safe to run multiple
-- notification-service instances without double-delivering scheduled emails.
ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'SENDING';
