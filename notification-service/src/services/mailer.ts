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
      if (attempt < maxRetries) {
        await wait(config.email.retryDelayMs);
      }
    }
  }

  const errorMessage = lastError instanceof Error ? lastError.message : "Unknown error";
  throw new Error(`Failed to send email after ${maxRetries} attempts: ${errorMessage}`);
}
