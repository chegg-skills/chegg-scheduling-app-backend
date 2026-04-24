-- AlterTable
ALTER TABLE "EventScheduleSlot" ADD COLUMN     "recurrenceGroupId" TEXT;

-- CreateTable
CREATE TABLE "SessionLog" (
    "id" TEXT NOT NULL,
    "scheduleSlotId" TEXT NOT NULL,
    "loggedByUserId" TEXT NOT NULL,
    "topicsDiscussed" TEXT,
    "summary" TEXT,
    "coachNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionAttendance" (
    "id" TEXT NOT NULL,
    "sessionLogId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventWeeklyAvailability" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventWeeklyAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionLog_scheduleSlotId_key" ON "SessionLog"("scheduleSlotId");

-- CreateIndex
CREATE INDEX "SessionLog_scheduleSlotId_idx" ON "SessionLog"("scheduleSlotId");

-- CreateIndex
CREATE INDEX "SessionLog_loggedByUserId_idx" ON "SessionLog"("loggedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionAttendance_bookingId_key" ON "SessionAttendance"("bookingId");

-- CreateIndex
CREATE INDEX "SessionAttendance_sessionLogId_idx" ON "SessionAttendance"("sessionLogId");

-- CreateIndex
CREATE INDEX "EventWeeklyAvailability_eventId_dayOfWeek_idx" ON "EventWeeklyAvailability"("eventId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "EventScheduleSlot_recurrenceGroupId_idx" ON "EventScheduleSlot"("recurrenceGroupId");

-- AddForeignKey
ALTER TABLE "SessionLog" ADD CONSTRAINT "SessionLog_scheduleSlotId_fkey" FOREIGN KEY ("scheduleSlotId") REFERENCES "EventScheduleSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionLog" ADD CONSTRAINT "SessionLog_loggedByUserId_fkey" FOREIGN KEY ("loggedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAttendance" ADD CONSTRAINT "SessionAttendance_sessionLogId_fkey" FOREIGN KEY ("sessionLogId") REFERENCES "SessionLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAttendance" ADD CONSTRAINT "SessionAttendance_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventWeeklyAvailability" ADD CONSTRAINT "EventWeeklyAvailability_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
