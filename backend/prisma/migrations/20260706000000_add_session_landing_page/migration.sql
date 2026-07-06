-- AlterEnum
ALTER TYPE "MeetingLinkSource" ADD VALUE 'SESSION_LANDING_PAGE';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "sessionToken" TEXT;

-- Backfill sessionToken for existing rows
UPDATE "Booking" SET "sessionToken" = gen_random_uuid()::text WHERE "sessionToken" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_sessionToken_key" ON "Booking"("sessionToken");
