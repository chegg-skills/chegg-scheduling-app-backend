-- Add as nullable first to allow backfill
ALTER TABLE "Event" ADD COLUMN "timezone" TEXT;

-- Backfill from the event creator's timezone.
-- The admin who created the event set the availability windows in their timezone.
UPDATE "Event" e
SET "timezone" = u."timezone"
FROM "User" u
WHERE u.id = e."createdById";

-- Fallback: UTC for any event whose creator had no timezone set
UPDATE "Event"
SET "timezone" = 'UTC'
WHERE "timezone" IS NULL OR "timezone" = '';

-- Now enforce non-nullable with default
ALTER TABLE "Event" ALTER COLUMN "timezone" SET NOT NULL;
ALTER TABLE "Event" ALTER COLUMN "timezone" SET DEFAULT 'UTC';
