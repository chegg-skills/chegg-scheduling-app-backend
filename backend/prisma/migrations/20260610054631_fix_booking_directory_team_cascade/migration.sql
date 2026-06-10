-- DropForeignKey
ALTER TABLE "BookingDirectoryTeam" DROP CONSTRAINT "BookingDirectoryTeam_teamId_fkey";

-- AddForeignKey
ALTER TABLE "BookingDirectoryTeam" ADD CONSTRAINT "BookingDirectoryTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
