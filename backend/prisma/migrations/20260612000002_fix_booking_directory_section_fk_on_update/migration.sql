-- Re-create the BookingDirectorySection → EventType FK with ON UPDATE CASCADE.
-- The previous migration added the column with an inline REFERENCES clause which
-- defaults to ON UPDATE NO ACTION. Prisma expects ON UPDATE CASCADE (its default
-- for all generated FK constraints), so prisma migrate diff detects drift.
ALTER TABLE "BookingDirectorySection"
  DROP CONSTRAINT "BookingDirectorySection_eventTypeId_fkey";

ALTER TABLE "BookingDirectorySection"
  ADD CONSTRAINT "BookingDirectorySection_eventTypeId_fkey"
  FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
