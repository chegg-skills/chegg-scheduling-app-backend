-- CreateTable
CREATE TABLE "OutboxNotification" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "deadLetteredAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,

    CONSTRAINT "OutboxNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutboxNotification_processedAt_deadLetteredAt_attempts_clai_idx" ON "OutboxNotification"("processedAt", "deadLetteredAt", "attempts", "claimedAt");
