-- AlterTable: Add publicBookingSlug as nullable first
ALTER TABLE "EventGroup" ADD COLUMN "publicBookingSlug" TEXT;

-- Backfill existing groups with unique slugs using random MD5 suffix
UPDATE "EventGroup"
SET "publicBookingSlug" = CONCAT(
  TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(COALESCE("name", 'group')), '[^a-z0-9]+', '-', 'g')),
  '-',
  SUBSTR(MD5("id"), 1, 6)
)
WHERE "publicBookingSlug" IS NULL;

-- AlterTable: Make publicBookingSlug NOT NULL
ALTER TABLE "EventGroup" ALTER COLUMN "publicBookingSlug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "EventGroup_publicBookingSlug_key" ON "EventGroup"("publicBookingSlug");
