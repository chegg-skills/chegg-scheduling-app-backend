-- AlterTable
ALTER TABLE "User" ADD COLUMN     "zoomIsvLinkExpiresAt" TIMESTAMP(3),
ADD COLUMN     "zoomIsvLinkReminderDays" INTEGER;
