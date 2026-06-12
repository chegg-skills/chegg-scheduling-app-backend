-- Replace SessionType with EventType in BookingDirectorySection
-- This migration:
-- 1. Truncates BookingDirectorySection (existing rows reference SessionType IDs
--    that cannot be automatically mapped to EventType IDs — admins must recreate sections)
-- 2. Drops sessionTypeId from Event (directory membership is now implicit via eventTypeId)
-- 3. Replaces sessionTypeId with eventTypeId on BookingDirectorySection
-- 4. Drops the SessionType table

-- Step 1: Clear all sections (and their cascade-dependent BookingDirectoryTeam rows)
TRUNCATE TABLE "BookingDirectorySection" CASCADE;

-- Step 2: Remove Event → SessionType reference
ALTER TABLE "Event"
  DROP COLUMN IF EXISTS "sessionTypeId";

-- Step 3: Swap the FK on BookingDirectorySection from SessionType → EventType
ALTER TABLE "BookingDirectorySection"
  DROP COLUMN "sessionTypeId",
  ADD COLUMN "eventTypeId" TEXT NOT NULL REFERENCES "EventType"("id") ON DELETE RESTRICT;

-- Step 4: Unique constraint that mirrors the old one
ALTER TABLE "BookingDirectorySection"
  DROP CONSTRAINT IF EXISTS "BookingDirectorySection_bookingDirectoryId_sessionTypeId_key";

ALTER TABLE "BookingDirectorySection"
  ADD CONSTRAINT "BookingDirectorySection_bookingDirectoryId_eventTypeId_key"
  UNIQUE ("bookingDirectoryId", "eventTypeId");

-- Step 5: Index on eventTypeId
CREATE INDEX "BookingDirectorySection_eventTypeId_idx" ON "BookingDirectorySection"("eventTypeId");

-- Step 6: Drop the SessionType table (no FKs remain at this point)
DROP TABLE IF EXISTS "SessionType";
