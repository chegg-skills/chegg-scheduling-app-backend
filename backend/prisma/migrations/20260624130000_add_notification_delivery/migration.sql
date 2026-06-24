-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "notificationKey" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recipient" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "errorMessage" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDelivery_notificationKey_key" ON "NotificationDelivery"("notificationKey");

-- CreateIndex
CREATE INDEX "NotificationDelivery_entityType_entityId_idx" ON "NotificationDelivery"("entityType", "entityId");
