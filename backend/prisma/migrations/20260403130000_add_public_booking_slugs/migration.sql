-- Add public booking slugs for shareable team, event, and coach links
ALTER TABLE "User" ADD COLUMN "publicBookingSlug" TEXT;
ALTER TABLE "Team" ADD COLUMN "publicBookingSlug" TEXT;
ALTER TABLE "Event" ADD COLUMN "publicBookingSlug" TEXT;

UPDATE "User"
SET "publicBookingSlug" = CONCAT(
  TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(COALESCE("firstName", 'coach') || '-' || COALESCE("lastName", 'user')), '[^a-z0-9]+', '-', 'g')),
  '-',
  SUBSTR(MD5("id"), 1, 6)
)
WHERE "publicBookingSlug" IS NULL;

UPDATE "Team"
SET "publicBookingSlug" = CONCAT(
  TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(COALESCE("name", 'team')), '[^a-z0-9]+', '-', 'g')),
  '-',
  SUBSTR(MD5("id"), 1, 6)
)
WHERE "publicBookingSlug" IS NULL;

UPDATE "Event"
SET "publicBookingSlug" = CONCAT(
  TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(COALESCE("name", 'event')), '[^a-z0-9]+', '-', 'g')),
  '-',
  SUBSTR(MD5("id"), 1, 6)
)
WHERE "publicBookingSlug" IS NULL;

ALTER TABLE "User" ALTER COLUMN "publicBookingSlug" SET NOT NULL;
ALTER TABLE "Team" ALTER COLUMN "publicBookingSlug" SET NOT NULL;
ALTER TABLE "Event" ALTER COLUMN "publicBookingSlug" SET NOT NULL;

CREATE UNIQUE INDEX "User_publicBookingSlug_key" ON "User"("publicBookingSlug");
CREATE UNIQUE INDEX "Team_publicBookingSlug_key" ON "Team"("publicBookingSlug");
CREATE UNIQUE INDEX "Event_publicBookingSlug_key" ON "Event"("publicBookingSlug");
