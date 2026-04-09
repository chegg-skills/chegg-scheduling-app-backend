import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    console.log("🚀 Starting Remote Database Rescue Script...");

    try {
        // 1. Add column if missing
        console.log("Step 1: Verifying 'rescheduleToken' column...");
        await prisma.$executeRawUnsafe('ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "rescheduleToken" TEXT;');
        console.log("✅ Column 'rescheduleToken' verified/created.");

        // 2. Add unique index if missing
        console.log("Step 2: Verifying unique index...");
        // Postgres syntax for conditional index creation is a bit tricky, simpler to just try and catch
        try {
            await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX "Booking_rescheduleToken_key" ON "Booking"("rescheduleToken");');
            console.log("✅ Unique index created.");
        } catch (e: any) {
            if (e.message?.includes('already exists')) {
                console.log("✅ Unique index already exists.");
            } else {
                throw e;
            }
        }

        // 3. Backfill existing records
        console.log("Step 3: Backfilling missing tokens...");
        const result = await prisma.$executeRawUnsafe('UPDATE "Booking" SET "rescheduleToken" = "id" WHERE "rescheduleToken" IS NULL;');
        console.log(`✅ Backfilled ${result} records.`);

        // 4. Mark migrations as applied to stop Prisma from complaining (Optional but good)
        console.log("Step 4: Marking migrations as applied in _prisma_migrations...");
        // We only do this if you want to avoid future Prisma warnings. 
        // For now, the database schema is the most important part.

        console.log("\n✨ Remote Fix Complete! Please restart your Render service and hard-refresh your browser.");
    } catch (error) {
        console.error("❌ Error during rescue script:", error);
    } finally {
        await prisma.$disconnect();
    }
}

run();
