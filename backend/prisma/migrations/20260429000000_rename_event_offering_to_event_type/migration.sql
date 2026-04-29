-- Rename EventOffering table to EventType
ALTER TABLE "EventOffering" RENAME TO "EventType";

-- Rename foreign key column on Event
ALTER TABLE "Event" RENAME COLUMN "offeringId" TO "eventTypeId";

-- Rename indexes
ALTER INDEX "EventOffering_isActive_sortOrder_idx" RENAME TO "EventType_isActive_sortOrder_idx";
ALTER INDEX "Event_offeringId_idx" RENAME TO "Event_eventTypeId_idx";

-- Rename constraints
ALTER TABLE "EventType" RENAME CONSTRAINT "EventOffering_pkey" TO "EventType_pkey";
ALTER TABLE "EventType" RENAME CONSTRAINT "EventOffering_key_key" TO "EventType_key_key";
ALTER TABLE "EventType" RENAME CONSTRAINT "EventOffering_createdById_fkey" TO "EventType_createdById_fkey";
ALTER TABLE "EventType" RENAME CONSTRAINT "EventOffering_updatedById_fkey" TO "EventType_updatedById_fkey";
ALTER TABLE "Event" RENAME CONSTRAINT "Event_offeringId_fkey" TO "Event_eventTypeId_fkey";
