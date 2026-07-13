-- CreateIndex
CREATE INDEX "EventScheduleSlot_eventId_assignedCoachId_startTime_idx" ON "EventScheduleSlot"("eventId", "assignedCoachId", "startTime");
