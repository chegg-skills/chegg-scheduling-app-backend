-- AlterTable: add revokedAt to UserInvite and FK relation to User
ALTER TABLE "UserInvite" ADD COLUMN "revokedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "UserInvite" ADD CONSTRAINT "UserInvite_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
