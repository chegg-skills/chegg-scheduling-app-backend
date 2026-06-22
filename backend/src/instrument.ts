// Imported as the very first module in server.ts so Sentry can instrument
// downstream requires (http, express, pg) before they are loaded. No-op unless
// SENTRY_DSN is set, so dev/test/CI are unaffected.
import dotenv from "dotenv";

dotenv.config();

import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
  });
}

export const isSentryEnabled = (): boolean => Boolean(dsn);
