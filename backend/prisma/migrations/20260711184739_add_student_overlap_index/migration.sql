-- CreateIndex
CREATE INDEX "Booking_studentEmail_status_startTime_endTime_idx" ON "Booking"("studentEmail", "status", "startTime", "endTime");
