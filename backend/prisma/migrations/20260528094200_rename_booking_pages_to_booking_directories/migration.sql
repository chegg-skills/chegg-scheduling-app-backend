-- Rename tables
ALTER TABLE "BookingPage" RENAME TO "BookingDirectory";
ALTER TABLE "BookingPageSection" RENAME TO "BookingDirectorySection";
ALTER TABLE "BookingPageTeam" RENAME TO "BookingDirectoryTeam";

-- Rename columns
ALTER TABLE "BookingDirectorySection" RENAME COLUMN "bookingPageId" TO "bookingDirectoryId";

-- Rename indexes
ALTER INDEX "BookingPage_slug_key" RENAME TO "BookingDirectory_slug_key";
ALTER INDEX "BookingPageSection_bookingPageId_idx" RENAME TO "BookingDirectorySection_bookingDirectoryId_idx";
ALTER INDEX "BookingPageSection_bookingPageId_sessionTypeId_key" RENAME TO "BookingDirectorySection_bookingDirectoryId_sessionTypeId_key";
ALTER INDEX "BookingPageTeam_sectionId_idx" RENAME TO "BookingDirectoryTeam_sectionId_idx";
ALTER INDEX "BookingPageTeam_sectionId_teamId_key" RENAME TO "BookingDirectoryTeam_sectionId_teamId_key";

-- Rename constraints (primary key and foreign key)
ALTER TABLE "BookingDirectory" RENAME CONSTRAINT "BookingPage_pkey" TO "BookingDirectory_pkey";
ALTER TABLE "BookingDirectory" RENAME CONSTRAINT "BookingPage_createdById_fkey" TO "BookingDirectory_createdById_fkey";
ALTER TABLE "BookingDirectory" RENAME CONSTRAINT "BookingPage_updatedById_fkey" TO "BookingDirectory_updatedById_fkey";

ALTER TABLE "BookingDirectorySection" RENAME CONSTRAINT "BookingPageSection_pkey" TO "BookingDirectorySection_pkey";
ALTER TABLE "BookingDirectorySection" RENAME CONSTRAINT "BookingPageSection_bookingPageId_fkey" TO "BookingDirectorySection_bookingDirectoryId_fkey";
ALTER TABLE "BookingDirectorySection" RENAME CONSTRAINT "BookingPageSection_sessionTypeId_fkey" TO "BookingDirectorySection_sessionTypeId_fkey";

ALTER TABLE "BookingDirectoryTeam" RENAME CONSTRAINT "BookingPageTeam_pkey" TO "BookingDirectoryTeam_pkey";
ALTER TABLE "BookingDirectoryTeam" RENAME CONSTRAINT "BookingPageTeam_sectionId_fkey" TO "BookingDirectoryTeam_sectionId_fkey";
ALTER TABLE "BookingDirectoryTeam" RENAME CONSTRAINT "BookingPageTeam_teamId_fkey" TO "BookingDirectoryTeam_teamId_fkey";
