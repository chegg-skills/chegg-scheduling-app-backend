-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "deferCoachReveal" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "EventScheduleSlot" ADD COLUMN     "coachRevealSentAt" TIMESTAMP(3),
ADD COLUMN     "sessionJoinUrl" TEXT;
