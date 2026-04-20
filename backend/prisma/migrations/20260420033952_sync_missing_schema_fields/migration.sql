-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "targetCoHostCount" INTEGER;

-- AlterTable
ALTER TABLE "EventScheduleSlot" ADD COLUMN     "assignedCoachId" TEXT;

-- CreateIndex
CREATE INDEX "EventScheduleSlot_assignedCoachId_idx" ON "EventScheduleSlot"("assignedCoachId");

-- AddForeignKey
ALTER TABLE "EventScheduleSlot" ADD CONSTRAINT "EventScheduleSlot_assignedCoachId_fkey" FOREIGN KEY ("assignedCoachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
