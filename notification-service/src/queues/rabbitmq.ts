import amqp from "amqplib";

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
      console.log(`RabbitMQ reconnect attempt ${attempt}/${MAX_RECONNECT_ATTEMPTS} in ${delayMs}ms…`);
      await wait(delayMs);

      try {
        const rabbitConnection = await amqp.connect(
          process.env.RABBITMQ_URL ?? "amqp://localhost",
        );

        attachListeners(rabbitConnection);
        connection = rabbitConnection;
        reconnecting = false;
        console.log("RabbitMQ reconnected successfully.");
        return;
      } catch (error) {
        console.error(`RabbitMQ reconnect attempt ${attempt} failed:`, error);
      }
    }

    console.error(
      `RabbitMQ: exhausted ${MAX_RECONNECT_ATTEMPTS} reconnect attempts. Exiting.`,
    );
    process.exit(1);
  })();
};

const attachListeners = (conn: RabbitConnection): void => {
  conn.on("close", () => {
    console.warn("RabbitMQ connection closed. Scheduling reconnect…");
    connection = null;
    scheduleReconnect();
  });

  conn.on("error", (err: unknown) => {
    console.error("RabbitMQ connection error:", err);
    connection = null;
    scheduleReconnect();
  });
};

const getRabbitConnection = async (): Promise<RabbitConnection> => {
  if (connection) {
    return connection;
  }

  try {
    const rabbitConnection = await amqp.connect(
      process.env.RABBITMQ_URL ?? "amqp://localhost",
    );

    attachListeners(rabbitConnection);
    connection = rabbitConnection;
    return connection;
  } catch (error) {
    console.error("Error connecting to RabbitMQ:", error);
    throw error;
  }
};

export { getRabbitConnection };
