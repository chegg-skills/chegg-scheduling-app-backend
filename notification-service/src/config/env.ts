export const config = {
  email: {
    maxRetries: Number(process.env.EMAIL_MAX_RETRIES ?? 3),
    retryDelayMs: Number(process.env.EMAIL_RETRY_DELAY_MS ?? 3000),
    from:
      process.env.EMAIL_FROM ??
      process.env.SMTP_USER ??
      process.env.EMAIL_USERNAME ??
      "no-reply@example.com",
    logoUrl: process.env.EMAIL_LOGO_URL ?? "https://img.logokit.com/chegg.com",
  },
  scheduler: {
    enabled: process.env.REMINDER_SCHEDULER_ENABLED !== "false",
    intervalMs: Number(process.env.REMINDER_SCHEDULER_INTERVAL_MS ?? 60_000),
    batchSize: Number(process.env.REMINDER_BATCH_SIZE ?? 25),
  },
  health: {
    port: Number(process.env.HEALTH_PORT ?? 3001),
  },
  startup: {
    timeoutMs: Number(process.env.STARTUP_TIMEOUT_MS ?? 30_000),
  },
} as const;
