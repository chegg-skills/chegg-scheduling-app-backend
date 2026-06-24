-- CreateEnum
CREATE TYPE "BookingActivityType" AS ENUM ('BOOKING_CREATED', 'BOOKING_CONFIRMED', 'EMAIL_SENT', 'REMINDER_SENT', 'BOOKING_RESCHEDULED', 'BOOKING_CANCELLED', 'SESSION_COMPLETED', 'SESSION_NO_SHOW', 'SESSION_LOGGED', 'COACH_REASSIGNED', 'ATTENDANCE_UPDATED', 'FOLLOW_UP_BOOKED');

-- CreateEnum
CREATE TYPE "BookingActivityActor" AS ENUM ('STUDENT', 'COACH', 'ADMIN', 'SYSTEM');

-- CreateTable
CREATE TABLE "BookingActivity" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "activityType" "BookingActivityType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "BookingActivityActor" NOT NULL,
    "actorUserId" TEXT,
    "actorName" TEXT,
    "metadata" JSONB,

    CONSTRAINT "BookingActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingActivity_bookingId_idx" ON "BookingActivity"("bookingId");

-- CreateIndex
CREATE INDEX "BookingActivity_timestamp_idx" ON "BookingActivity"("timestamp");

-- AddForeignKey
ALTER TABLE "BookingActivity" ADD CONSTRAINT "BookingActivity_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingActivity" ADD CONSTRAINT "BookingActivity_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
