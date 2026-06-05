-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "recurrenceVisibilityLimit" INTEGER;

-- CreateTable
CREATE TABLE "RecurrenceGroup" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "isContinuous" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurrenceGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurrenceGroup_eventId_idx" ON "RecurrenceGroup"("eventId");

-- Backfill existing recurrenceGroupId values from EventScheduleSlot into RecurrenceGroup
INSERT INTO "RecurrenceGroup" ("id", "eventId", "frequency", "isContinuous", "isActive", "createdAt", "updatedAt")
SELECT DISTINCT ON ("recurrenceGroupId") "recurrenceGroupId", "eventId", 'WEEKLY', false, true, NOW(), NOW()
FROM "EventScheduleSlot"
WHERE "recurrenceGroupId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "EventScheduleSlot" ADD CONSTRAINT "EventScheduleSlot_recurrenceGroupId_fkey" FOREIGN KEY ("recurrenceGroupId") REFERENCES "RecurrenceGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurrenceGroup" ADD CONSTRAINT "RecurrenceGroup_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
