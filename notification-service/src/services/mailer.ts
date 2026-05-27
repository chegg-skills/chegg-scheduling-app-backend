import nodemailer from "nodemailer";
import { config } from "../config/env";

type Transporter = ReturnType<typeof nodemailer.createTransport>;
export type SendMailOptions = Parameters<Transporter["sendMail"]>[0];
export type SentMessageInfo = Awaited<ReturnType<Transporter["sendMail"]>>;

export const DEFAULT_FROM_EMAIL = config.email.from;

const buildTransporter = (): Transporter => {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }

  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE ?? "gmail",
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

const transporter = buildTransporter();

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Determines whether an SMTP error is retryable.
 * Non-retryable errors include:
 *   - Rate limits / sending limits (550 5.4.5)
 *   - Permanent rejections (5xx where the server won't accept the message)
 *   - Authentication failures (535)
 *   - Invalid recipients (550 5.1.x, 551, 552, 553)
 *
 * Retryable errors include transient failures:
 *   - Connection timeouts (ECONNRESET, ETIMEDOUT)
 *   - Temporary server unavailability (421, 450, 451)
 */
function isNonRetryableSmtpError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  // Gmail / Google Workspace rate limit
  if (message.includes("daily user sending limit exceeded")) return true;
  if (message.includes("5.4.5")) return true;

  // Generic rate limiting
  if (message.includes("rate limit")) return true;
  if (message.includes("too many")) return true;

  // Authentication failures — retrying won't help
  if (message.includes("535") || message.includes("authentication")) return true;
  if (message.includes("username and password not accepted")) return true;

  // Permanent 5xx SMTP rejections (sender/recipient policy rejections)
  // 550 = mailbox unavailable / policy reject, 551/552/553 = permanent
  if (/\b55[012356]\b/.test(message)) return true;

  return false;
}

export async function sendEmailWithRetry(
  mailOptions: SendMailOptions,
  maxRetries = config.email.maxRetries,
): Promise<SentMessageInfo> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await transporter.sendMail(mailOptions);
    } catch (error) {
      lastError = error;

      // Do not retry non-retryable errors — they will never succeed
      if (isNonRetryableSmtpError(error)) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Email delivery permanently failed (non-retryable): ${errorMessage}`);
      }

      if (attempt < maxRetries) {
        await wait(config.email.retryDelayMs);
      }
    }
  }

  const errorMessage = lastError instanceof Error ? lastError.message : "Unknown error";
  throw new Error(`Failed to send email after ${maxRetries} attempts: ${errorMessage}`);
}
