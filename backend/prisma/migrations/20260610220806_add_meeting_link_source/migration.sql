-- CreateEnum
CREATE TYPE "MeetingLinkSource" AS ENUM ('COACH_ISV', 'EVENT_LOCATION');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "meetingLinkSource" "MeetingLinkSource" NOT NULL DEFAULT 'COACH_ISV';
