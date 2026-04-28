-- Rename table EventOffering → EventType
ALTER TABLE "EventOffering" RENAME TO "EventType";

-- Rename primary key constraint
ALTER INDEX "EventOffering_pkey" RENAME TO "EventType_pkey";

-- Rename unique index on key column
ALTER INDEX "EventOffering_key_key" RENAME TO "EventType_key_key";

-- Rename composite index
ALTER INDEX "EventOffering_isActive_sortOrder_idx" RENAME TO "EventType_isActive_sortOrder_idx";

-- Rename foreign key constraints on EventType
ALTER TABLE "EventType" RENAME CONSTRAINT "EventOffering_createdById_fkey" TO "EventType_createdById_fkey";
ALTER TABLE "EventType" RENAME CONSTRAINT "EventOffering_updatedById_fkey" TO "EventType_updatedById_fkey";

-- Rename column offeringId → eventTypeId on Event
ALTER TABLE "Event" RENAME COLUMN "offeringId" TO "eventTypeId";

-- Rename index on Event.eventTypeId
ALTER INDEX "Event_offeringId_idx" RENAME TO "Event_eventTypeId_idx";

-- Rename foreign key constraint on Event
ALTER TABLE "Event" RENAME CONSTRAINT "Event_offeringId_fkey" TO "Event_eventTypeId_fkey";
