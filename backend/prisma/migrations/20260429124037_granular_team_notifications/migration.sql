/*
  Warnings:

  - You are about to drop the column `notifyAdminOnBooking` on the `TeamNotificationConfig` table. All the data in the column will be lost.
  - You are about to drop the column `notifyCoachOnBooking` on the `TeamNotificationConfig` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TeamNotificationConfig" DROP COLUMN "notifyAdminOnBooking",
DROP COLUMN "notifyCoachOnBooking",
ADD COLUMN     "adminNotifyOnBooking" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "adminNotifyOnCancellation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "adminNotifyOnNoShow" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "coachNotifyOnBooking" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "coachNotifyOnCancellation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "coachNotifyOnNoShow" BOOLEAN NOT NULL DEFAULT true;
