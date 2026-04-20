/*
  Warnings:

  - You are about to drop the column `targetCoHostCount` on the `Event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "targetCoHostCount",
ADD COLUMN     "showDescription" BOOLEAN NOT NULL DEFAULT false;
