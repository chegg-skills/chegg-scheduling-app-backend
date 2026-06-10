-- CreateTable
CREATE TABLE "EventCoachWeeklyAvailability" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventCoachWeeklyAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventCoachWeeklyAvailability_eventId_coachUserId_dayOfWeek_idx" ON "EventCoachWeeklyAvailability"("eventId", "coachUserId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "EventCoachWeeklyAvailability" ADD CONSTRAINT "EventCoachWeeklyAvailability_eventId_coachUserId_fkey" FOREIGN KEY ("eventId", "coachUserId") REFERENCES "EventCoach"("eventId", "coachUserId") ON DELETE CASCADE ON UPDATE CASCADE;
