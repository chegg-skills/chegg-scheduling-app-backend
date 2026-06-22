/*
  Warnings:

  - You are about to drop the column `bookingId` on the `OutboxNotification` table. All the data in the column will be lost.
  - You are about to drop the column `kind` on the `OutboxNotification` table. All the data in the column will be lost.
  - Added the required column `payload` to the `OutboxNotification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `OutboxNotification` table without a default value. This is not possible if the table is not empty.

*/
-- The outbox is an ephemeral queue (this feature is unshipped). Clear any rows so
-- the new NOT NULL columns can be added cleanly.
TRUNCATE TABLE "OutboxNotification";

-- AlterTable
ALTER TABLE "OutboxNotification" DROP COLUMN "bookingId",
DROP COLUMN "kind",
ADD COLUMN     "entityId" TEXT,
ADD COLUMN     "entityType" TEXT,
ADD COLUMN     "notificationKey" TEXT,
ADD COLUMN     "payload" JSONB NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "OutboxNotification_processedAt_createdAt_idx" ON "OutboxNotification"("processedAt", "createdAt");
