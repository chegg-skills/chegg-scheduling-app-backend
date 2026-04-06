-- Create the student entity and link historical bookings to it
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE "Student" (
  "id" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "firstBookedAt" TIMESTAMP(3),
  "lastBookedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Booking" ADD COLUMN "studentId" TEXT;

INSERT INTO "Student" (
  "id",
  "fullName",
  "email",
  "firstBookedAt",
  "lastBookedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  latest."fullName",
  latest."email",
  stats."firstBookedAt",
  stats."lastBookedAt",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON (LOWER(TRIM("studentEmail")))
    LOWER(TRIM("studentEmail")) AS "email",
    COALESCE(NULLIF(TRIM("studentName"), ''), SPLIT_PART(LOWER(TRIM("studentEmail")), '@', 1)) AS "fullName"
  FROM "Booking"
  WHERE "studentEmail" IS NOT NULL AND TRIM("studentEmail") <> ''
  ORDER BY LOWER(TRIM("studentEmail")), "createdAt" DESC
) latest
JOIN (
  SELECT
    LOWER(TRIM("studentEmail")) AS "email",
    MIN("startTime") AS "firstBookedAt",
    MAX("startTime") AS "lastBookedAt"
  FROM "Booking"
  WHERE "studentEmail" IS NOT NULL AND TRIM("studentEmail") <> ''
  GROUP BY LOWER(TRIM("studentEmail"))
) stats
  ON stats."email" = latest."email";

UPDATE "Booking" AS booking
SET "studentId" = student."id"
FROM "Student" AS student
WHERE LOWER(TRIM(booking."studentEmail")) = student."email";

CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");
CREATE INDEX "Student_lastBookedAt_idx" ON "Student"("lastBookedAt");
CREATE INDEX "Booking_studentId_idx" ON "Booking"("studentId");

ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
