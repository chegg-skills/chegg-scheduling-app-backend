-- AlterTable
ALTER TABLE "SessionLog" ADD COLUMN "bookingId" TEXT;
ALTER TABLE "SessionLog" ALTER COLUMN "scheduleSlotId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SessionLog_bookingId_key" ON "SessionLog"("bookingId");
CREATE INDEX "SessionLog_bookingId_idx" ON "SessionLog"("bookingId");

-- AddForeignKey
ALTER TABLE "SessionLog"
ADD CONSTRAINT "SessionLog_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint (XOR: exactly one of scheduleSlotId or bookingId must be set)
ALTER TABLE "SessionLog"
ADD CONSTRAINT "session_log_owner_xor"
CHECK (
  ("scheduleSlotId" IS NOT NULL AND "bookingId" IS NULL)
  OR
  ("scheduleSlotId" IS NULL AND "bookingId" IS NOT NULL)
);
