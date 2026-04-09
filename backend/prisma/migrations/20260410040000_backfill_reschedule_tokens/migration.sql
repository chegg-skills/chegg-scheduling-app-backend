-- Backfill existing NULL tokens with the booking ID (which is already a unique UUID)
UPDATE "Booking" SET "rescheduleToken" = "id" WHERE "rescheduleToken" IS NULL;
