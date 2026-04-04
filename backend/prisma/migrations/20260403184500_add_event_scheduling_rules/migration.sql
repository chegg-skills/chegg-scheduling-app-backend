-- CreateEnum
CREATE TYPE "EventBookingMode" AS ENUM ('HOST_AVAILABILITY', 'FIXED_SLOTS');

-- AlterTable
ALTER TABLE "Event"
ADD COLUMN     "bookingMode" "EventBookingMode" NOT NULL DEFAULT 'HOST_AVAILABILITY',
ADD COLUMN     "allowedWeekdays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "minimumNoticeMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "minParticipantCount" INTEGER,
ADD COLUMN     "maxParticipantCount" INTEGER;

ALTER TABLE "Booking"
ADD COLUMN     "scheduleSlotId" TEXT;

-- CreateTable
CREATE TABLE "EventScheduleSlot" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventScheduleSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_bookingMode_idx" ON "Event"("bookingMode");
CREATE INDEX "EventScheduleSlot_eventId_startTime_isActive_idx" ON "EventScheduleSlot"("eventId", "startTime", "isActive");
CREATE UNIQUE INDEX "EventScheduleSlot_eventId_startTime_key" ON "EventScheduleSlot"("eventId", "startTime");
CREATE INDEX "Booking_scheduleSlotId_idx" ON "Booking"("scheduleSlotId");

-- AddForeignKey
ALTER TABLE "EventScheduleSlot" ADD CONSTRAINT "EventScheduleSlot_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_scheduleSlotId_fkey" FOREIGN KEY ("scheduleSlotId") REFERENCES "EventScheduleSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
