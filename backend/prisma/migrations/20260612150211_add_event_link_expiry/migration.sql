-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "locationLinkExpiresAt" TIMESTAMP(3),
ADD COLUMN     "locationLinkReminderDays" INTEGER;
