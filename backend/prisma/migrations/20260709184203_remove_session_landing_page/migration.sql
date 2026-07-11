-- AlterEnum
BEGIN;
CREATE TYPE "MeetingLinkSource_new" AS ENUM ('COACH_ISV', 'EVENT_LOCATION');
ALTER TABLE "public"."Event" ALTER COLUMN "meetingLinkSource" DROP DEFAULT;
ALTER TABLE "Event" ALTER COLUMN "meetingLinkSource" TYPE "MeetingLinkSource_new" USING ("meetingLinkSource"::text::"MeetingLinkSource_new");
ALTER TYPE "MeetingLinkSource" RENAME TO "MeetingLinkSource_old";
ALTER TYPE "MeetingLinkSource_new" RENAME TO "MeetingLinkSource";
DROP TYPE "public"."MeetingLinkSource_old";
ALTER TABLE "Event" ALTER COLUMN "meetingLinkSource" SET DEFAULT 'COACH_ISV';
COMMIT;
