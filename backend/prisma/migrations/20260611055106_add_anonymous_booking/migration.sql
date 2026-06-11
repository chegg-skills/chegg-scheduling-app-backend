-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_coachUserId_fkey";

-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "coachUserId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "allowAnonymousBooking" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TeamNotificationConfig" ADD COLUMN     "poolReminderOffsets" INTEGER[] DEFAULT ARRAY[1440, 360]::INTEGER[];

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
