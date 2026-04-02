-- Add per-user Zoom ISV links and booking-level meeting URL snapshots
ALTER TABLE "User"
ADD COLUMN "zoomIsvLink" TEXT;

ALTER TABLE "Booking"
ADD COLUMN "meetingJoinUrl" TEXT;