CREATE EXTENSION IF NOT EXISTS "pgcrypto";
UPDATE "Booking" SET "rescheduleToken" = encode(gen_random_bytes(16), 'hex') WHERE "rescheduleToken" IS NULL;
