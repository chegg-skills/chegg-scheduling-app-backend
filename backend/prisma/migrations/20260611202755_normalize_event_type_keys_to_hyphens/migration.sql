-- DropForeignKey
ALTER TABLE "BookingDirectorySection" DROP CONSTRAINT "BookingDirectorySection_eventTypeId_fkey";

-- AddForeignKey
ALTER TABLE "BookingDirectorySection" ADD CONSTRAINT "BookingDirectorySection_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
