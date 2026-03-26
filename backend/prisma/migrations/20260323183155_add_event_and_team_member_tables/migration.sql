-- CreateEnum
CREATE TYPE "AssignmentStrategy" AS ENUM ('DIRECT', 'ROUND_ROBIN');

-- CreateEnum
CREATE TYPE "EventLocationType" AS ENUM ('VIRTUAL', 'IN_PERSON', 'CUSTOM');

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventOffering" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventInteractionType" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "supportsRoundRobin" BOOLEAN NOT NULL DEFAULT false,
    "supportsMultipleHosts" BOOLEAN NOT NULL DEFAULT false,
    "minHosts" INTEGER NOT NULL DEFAULT 1,
    "maxHosts" INTEGER,
    "minParticipants" INTEGER NOT NULL DEFAULT 1,
    "maxParticipants" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventInteractionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "offeringId" TEXT NOT NULL,
    "interactionTypeId" TEXT NOT NULL,
    "assignmentStrategy" "AssignmentStrategy" NOT NULL DEFAULT 'DIRECT',
    "durationSeconds" INTEGER NOT NULL,
    "locationType" "EventLocationType" NOT NULL,
    "locationValue" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "teamId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventHost" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "hostOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventHost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRoutingState" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "nextHostOrder" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRoutingState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

-- CreateIndex
CREATE INDEX "TeamMember_teamId_isActive_idx" ON "TeamMember"("teamId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventOffering_key_key" ON "EventOffering"("key");

-- CreateIndex
CREATE INDEX "EventOffering_isActive_sortOrder_idx" ON "EventOffering"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "EventInteractionType_key_key" ON "EventInteractionType"("key");

-- CreateIndex
CREATE INDEX "EventInteractionType_isActive_sortOrder_idx" ON "EventInteractionType"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "Event_teamId_isActive_idx" ON "Event"("teamId", "isActive");

-- CreateIndex
CREATE INDEX "Event_offeringId_idx" ON "Event"("offeringId");

-- CreateIndex
CREATE INDEX "Event_interactionTypeId_idx" ON "Event"("interactionTypeId");

-- CreateIndex
CREATE INDEX "Event_assignmentStrategy_idx" ON "Event"("assignmentStrategy");

-- CreateIndex
CREATE INDEX "EventHost_hostUserId_idx" ON "EventHost"("hostUserId");

-- CreateIndex
CREATE INDEX "EventHost_eventId_isActive_idx" ON "EventHost"("eventId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "EventHost_eventId_hostUserId_key" ON "EventHost"("eventId", "hostUserId");

-- CreateIndex
CREATE UNIQUE INDEX "EventHost_eventId_hostOrder_key" ON "EventHost"("eventId", "hostOrder");

-- CreateIndex
CREATE UNIQUE INDEX "EventRoutingState_eventId_key" ON "EventRoutingState"("eventId");

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventOffering" ADD CONSTRAINT "EventOffering_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventOffering" ADD CONSTRAINT "EventOffering_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInteractionType" ADD CONSTRAINT "EventInteractionType_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInteractionType" ADD CONSTRAINT "EventInteractionType_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "EventOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_interactionTypeId_fkey" FOREIGN KEY ("interactionTypeId") REFERENCES "EventInteractionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventHost" ADD CONSTRAINT "EventHost_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventHost" ADD CONSTRAINT "EventHost_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRoutingState" ADD CONSTRAINT "EventRoutingState_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
