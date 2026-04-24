-- AlterTable: make password nullable for SSO users
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- AlterTable: add SSO identity fields to User
ALTER TABLE "User" ADD COLUMN "ssoProvider" TEXT,
                   ADD COLUMN "ssoSub"      TEXT,
                   ADD COLUMN "ssoLinkedAt" TIMESTAMP(3);

-- CreateIndex: unique constraint on (ssoProvider, ssoSub)
-- NULL != NULL in Postgres, so existing users with NULL values do not conflict
CREATE UNIQUE INDEX "User_ssoProvider_ssoSub_key" ON "User"("ssoProvider", "ssoSub");

-- AlterTable: add requiresSso flag to UserInvite
ALTER TABLE "UserInvite" ADD COLUMN "requiresSso" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: OidcState for CSRF state validation (one-time use, 10-min TTL)
CREATE TABLE "OidcState" (
    "id"          TEXT NOT NULL,
    "state"       TEXT NOT NULL,
    "nonce"       TEXT NOT NULL,
    "inviteToken" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OidcState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique state value
CREATE UNIQUE INDEX "OidcState_state_key" ON "OidcState"("state");
