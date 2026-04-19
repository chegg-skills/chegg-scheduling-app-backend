/*
  Warnings:

  - The values [HOST_AVAILABILITY] on the enum `EventBookingMode` will be removed. If these variants are still used in the database, this will fail.
  - The values [SINGLE_HOST] on the enum `SessionLeadershipStrategy` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `coHostUserIds` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `hostUserId` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `maxHostCount` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `minHostCount` on the `Event` table. All the data in the column will be lost.
  - Added the required column `coachUserId` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EventBookingMode_new" AS ENUM ('COACH_AVAILABILITY', 'FIXED_SLOTS');
ALTER TABLE "public"."Event" ALTER COLUMN "bookingMode" DROP DEFAULT;
ALTER TABLE "Event" ALTER COLUMN "bookingMode" TYPE "EventBookingMode_new" USING ("bookingMode"::text::"EventBookingMode_new");
ALTER TYPE "EventBookingMode" RENAME TO "EventBookingMode_old";
ALTER TYPE "EventBookingMode_new" RENAME TO "EventBookingMode";
DROP TYPE "public"."EventBookingMode_old";
ALTER TABLE "Event" ALTER COLUMN "bookingMode" SET DEFAULT 'COACH_AVAILABILITY';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "SessionLeadershipStrategy_new" AS ENUM ('SINGLE_COACH', 'FIXED_LEAD', 'ROTATING_LEAD');
ALTER TABLE "public"."Event" ALTER COLUMN "sessionLeadershipStrategy" DROP DEFAULT;
ALTER TABLE "Event" ALTER COLUMN "sessionLeadershipStrategy" TYPE "SessionLeadershipStrategy_new" USING ("sessionLeadershipStrategy"::text::"SessionLeadershipStrategy_new");
ALTER TYPE "SessionLeadershipStrategy" RENAME TO "SessionLeadershipStrategy_old";
ALTER TYPE "SessionLeadershipStrategy_new" RENAME TO "SessionLeadershipStrategy";
DROP TYPE "public"."SessionLeadershipStrategy_old";
ALTER TABLE "Event" ALTER COLUMN "sessionLeadershipStrategy" SET DEFAULT 'SINGLE_COACH';
COMMIT;

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_hostUserId_fkey";

-- DropIndex
DROP INDEX "Booking_hostUserId_idx";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "coHostUserIds",
DROP COLUMN "hostUserId",
ADD COLUMN     "coCoachUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "coachUserId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "maxHostCount",
DROP COLUMN "minHostCount",
ADD COLUMN     "maxCoachCount" INTEGER,
ADD COLUMN     "minCoachCount" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "bookingMode" SET DEFAULT 'COACH_AVAILABILITY',
ALTER COLUMN "sessionLeadershipStrategy" SET DEFAULT 'SINGLE_COACH';

-- AlterTable
ALTER TABLE "EventCoach" RENAME CONSTRAINT "EventHost_pkey" TO "EventCoach_pkey";

-- CreateIndex
CREATE INDEX "Booking_coachUserId_idx" ON "Booking"("coachUserId");

-- RenameForeignKey
ALTER TABLE "EventCoach" RENAME CONSTRAINT "EventHost_eventId_fkey" TO "EventCoach_eventId_fkey";

-- RenameForeignKey
ALTER TABLE "EventCoach" RENAME CONSTRAINT "EventHost_hostUserId_fkey" TO "EventCoach_coachUserId_fkey";

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
