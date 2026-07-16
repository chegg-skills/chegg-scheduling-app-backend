import * as Sentry from "@sentry/node";
import amqp from "amqplib";
import { logger } from "../logger";

type RabbitConnection = Awaited<ReturnType<typeof amqp.connect>>;

const MAX_RECONNECT_ATTEMPTS = Number(process.env.RABBITMQ_MAX_RECONNECT_ATTEMPTS ?? 10);
const RECONNECT_BASE_DELAY_MS = Number(process.env.RABBITMQ_RECONNECT_BASE_DELAY_MS ?? 1000);

let connection: RabbitConnection | null = null;
let reconnecting = false;

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const scheduleReconnect = (): void => {
  if (reconnecting) {
    return;
  }

  reconnecting = true;

  void (async () => {
    for (let attempt = 1; attempt <= MAX_RECONNECT_ATTEMPTS; attempt++) {
      const delayMs = RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      logger.warn({ attempt, maxAttempts: MAX_RECONNECT_ATTEMPTS, delayMs }, "RabbitMQ reconnecting...");
      await wait(delayMs);

      try {
        const rabbitConnection = await amqp.connect(process.env.RABBITMQ_URL ?? "amqp://localhost");

        attachListeners(rabbitConnection);
        connection = rabbitConnection;
        reconnecting = false;
        logger.info("RabbitMQ reconnected successfully.");
        return;
      } catch (error) {
        logger.warn({ attempt, error }, "RabbitMQ reconnect attempt failed.");
      }
    }

    logger.fatal({ maxAttempts: MAX_RECONNECT_ATTEMPTS }, "RabbitMQ: exhausted reconnect attempts — exiting.");
    Sentry.captureException(new Error("RabbitMQ reconnect attempts exhausted"));
    process.exit(1);
  })();
};

const attachListeners = (conn: RabbitConnection): void => {
  conn.on("close", () => {
    logger.warn("RabbitMQ connection closed — scheduling reconnect.");
    connection = null;
    scheduleReconnect();
  });

  conn.on("error", (err: unknown) => {
    logger.error({ error: err }, "RabbitMQ connection error.");
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    connection = null;
    scheduleReconnect();
  });
};

const getRabbitConnection = async (): Promise<RabbitConnection> => {
  if (connection) {
    return connection;
  }

  try {
    const rabbitConnection = await amqp.connect(process.env.RABBITMQ_URL ?? "amqp://localhost");

    attachListeners(rabbitConnection);
    connection = rabbitConnection;
    return connection;
  } catch (error) {
    logger.error({ error }, "Error connecting to RabbitMQ.");
    throw error;
  }
};

/** Cheap readiness signal: true when a live connection is currently held. */
const isRabbitConnected = (): boolean => connection !== null;

export { getRabbitConnection, isRabbitConnected };
