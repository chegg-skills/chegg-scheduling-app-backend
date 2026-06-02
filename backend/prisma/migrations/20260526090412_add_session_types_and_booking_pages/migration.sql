-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "sessionTypeId" TEXT;

-- CreateTable
CREATE TABLE "SessionType" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingPageSection" (
    "id" TEXT NOT NULL,
    "bookingPageId" TEXT NOT NULL,
    "sessionTypeId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingPageSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingPageTeam" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingPageTeam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionType_slug_key" ON "SessionType"("slug");

-- CreateIndex
CREATE INDEX "SessionType_isActive_sortOrder_idx" ON "SessionType"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "BookingPage_slug_key" ON "BookingPage"("slug");

-- CreateIndex
CREATE INDEX "BookingPageSection_bookingPageId_idx" ON "BookingPageSection"("bookingPageId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingPageSection_bookingPageId_sessionTypeId_key" ON "BookingPageSection"("bookingPageId", "sessionTypeId");

-- CreateIndex
CREATE INDEX "BookingPageTeam_sectionId_idx" ON "BookingPageTeam"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingPageTeam_sectionId_teamId_key" ON "BookingPageTeam"("sectionId", "teamId");

-- CreateIndex
CREATE INDEX "Event_sessionTypeId_idx" ON "Event"("sessionTypeId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_sessionTypeId_fkey" FOREIGN KEY ("sessionTypeId") REFERENCES "SessionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionType" ADD CONSTRAINT "SessionType_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionType" ADD CONSTRAINT "SessionType_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPage" ADD CONSTRAINT "BookingPage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPage" ADD CONSTRAINT "BookingPage_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPageSection" ADD CONSTRAINT "BookingPageSection_bookingPageId_fkey" FOREIGN KEY ("bookingPageId") REFERENCES "BookingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPageSection" ADD CONSTRAINT "BookingPageSection_sessionTypeId_fkey" FOREIGN KEY ("sessionTypeId") REFERENCES "SessionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPageTeam" ADD CONSTRAINT "BookingPageTeam_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "BookingPageSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPageTeam" ADD CONSTRAINT "BookingPageTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
