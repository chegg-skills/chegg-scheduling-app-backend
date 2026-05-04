-- CreateTable
CREATE TABLE "TeamNotificationConfig" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "reminderOffsets" INTEGER[] DEFAULT ARRAY[1440, 60]::INTEGER[],
    "notifyAdminOnBooking" BOOLEAN NOT NULL DEFAULT true,
    "notifyCoachOnBooking" BOOLEAN NOT NULL DEFAULT true,
    "notifyLeadOnAvailability" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamNotificationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamNotificationConfig_teamId_key" ON "TeamNotificationConfig"("teamId");

-- AddForeignKey
ALTER TABLE "TeamNotificationConfig" ADD CONSTRAINT "TeamNotificationConfig_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
