-- ============================================================
-- Migration: interaction_type_enum_and_event_coach_rename
--
-- Changes:
--  1. Create InteractionType enum
--  2. Add new columns to Event (nullable for backfill)
--  3. Backfill interactionType from EventInteractionType.key
--  4. Backfill minHostCount/maxHostCount from EventInteractionType
--  5. Backfill fixedLeadCoachId from fixedLeadHostId
--  6. Make interactionType NOT NULL
--  7. Add minHostCount/maxHostCount columns
--  8. Rename EventHost table and columns -> EventCoach
--  9. Rename EventRoutingState.nextHostOrder -> nextCoachOrder
-- 10. Drop old FK column and EventInteractionType table
-- ============================================================

-- Step 1: Create the InteractionType enum
CREATE TYPE "InteractionType" AS ENUM ('ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_ONE', 'MANY_TO_MANY');

-- Step 2: Add new columns to Event (nullable first for safe backfill)
ALTER TABLE "Event"
  ADD COLUMN "interactionType"  "InteractionType",
  ADD COLUMN "minHostCount"     INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "maxHostCount"     INTEGER,
  ADD COLUMN "fixedLeadCoachId" TEXT;

-- Step 3: Backfill interactionType from EventInteractionType.key
-- SAFETY: run the check query first in psql to confirm 0 rows before deploying:
--   SELECT DISTINCT eit.key FROM "Event" e
--   JOIN "EventInteractionType" eit ON e."interactionTypeId" = eit.id
--   WHERE eit.key NOT IN ('ONE_TO_ONE','ONE_TO_MANY','MANY_TO_ONE','MANY_TO_MANY');
UPDATE "Event" e
SET "interactionType" = eit.key::"InteractionType"
FROM "EventInteractionType" eit
WHERE e."interactionTypeId" = eit.id;

-- Step 4: Backfill minHostCount / maxHostCount from interaction type
UPDATE "Event" e
SET "minHostCount" = COALESCE(eit."minHosts", 1),
    "maxHostCount" = eit."maxHosts"
FROM "EventInteractionType" eit
WHERE e."interactionTypeId" = eit.id;

-- Step 5: Backfill fixedLeadCoachId from fixedLeadHostId
UPDATE "Event"
SET "fixedLeadCoachId" = "fixedLeadHostId";

-- Step 6: Make interactionType NOT NULL now that all rows are backfilled
ALTER TABLE "Event" ALTER COLUMN "interactionType" SET NOT NULL;

-- Step 7: Add index on new enum column
CREATE INDEX "Event_interactionType_idx" ON "Event"("interactionType");

-- Step 8: Rename EventHost table and its columns
ALTER TABLE "EventHost" RENAME TO "EventCoach";
ALTER TABLE "EventCoach" RENAME COLUMN "hostUserId" TO "coachUserId";
ALTER TABLE "EventCoach" RENAME COLUMN "hostOrder"  TO "coachOrder";

-- Rename constraints to match new names
ALTER INDEX "EventHost_eventId_hostUserId_key"  RENAME TO "EventCoach_eventId_coachUserId_key";
ALTER INDEX "EventHost_eventId_hostOrder_key"   RENAME TO "EventCoach_eventId_coachOrder_key";
ALTER INDEX "EventHost_hostUserId_idx"          RENAME TO "EventCoach_coachUserId_idx";
ALTER INDEX "EventHost_eventId_isActive_idx"    RENAME TO "EventCoach_eventId_isActive_idx";

-- Step 9: Rename EventRoutingState column
ALTER TABLE "EventRoutingState" RENAME COLUMN "nextHostOrder" TO "nextCoachOrder";

-- Step 10: Drop old FK column and the EventInteractionType table
ALTER TABLE "Event"
  DROP COLUMN "interactionTypeId",
  DROP COLUMN "fixedLeadHostId";

DROP TABLE "EventInteractionType";
