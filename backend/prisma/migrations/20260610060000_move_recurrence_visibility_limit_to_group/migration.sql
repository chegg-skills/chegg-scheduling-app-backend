-- Add recurrenceVisibilityLimit to RecurrenceGroup
ALTER TABLE "RecurrenceGroup" ADD COLUMN "recurrenceVisibilityLimit" INTEGER;

-- Backfill: copy the event-level value to every RecurrenceGroup in that event
UPDATE "RecurrenceGroup" rg
SET "recurrenceVisibilityLimit" = e."recurrenceVisibilityLimit"
FROM "Event" e
WHERE rg."eventId" = e.id
  AND e."recurrenceVisibilityLimit" IS NOT NULL;

-- Drop the column from Event
ALTER TABLE "Event" DROP COLUMN "recurrenceVisibilityLimit";
