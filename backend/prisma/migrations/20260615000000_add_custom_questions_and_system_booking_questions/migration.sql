-- Add custom questions fields to Event (already applied to DB)
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "customQuestions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "useDefaultQuestions" BOOLEAN NOT NULL DEFAULT true;

-- Add custom questions/answers snapshot fields to Booking (already applied to DB)
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "customQuestions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "customAnswers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Create SystemBookingQuestion table
CREATE TABLE "SystemBookingQuestion" (
    "id" TEXT NOT NULL,
    "text" VARCHAR(255) NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemBookingQuestion_pkey" PRIMARY KEY ("id")
);
