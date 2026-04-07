-- CreateEnum
CREATE TYPE "SessionLeadershipStrategy" AS ENUM ('SINGLE_HOST', 'FIXED_LEAD', 'ROTATING_LEAD');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "coHostUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "fixedLeadHostId" TEXT,
ADD COLUMN     "sessionLeadershipStrategy" "SessionLeadershipStrategy" NOT NULL DEFAULT 'SINGLE_HOST';

-- AlterTable
ALTER TABLE "EventInteractionType" ADD COLUMN     "supportsSimultaneousCoaches" BOOLEAN NOT NULL DEFAULT false;
