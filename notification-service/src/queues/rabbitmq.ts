import amqp from "amqplib";

type RabbitConnection = Awaited<ReturnType<typeof amqp.connect>>;

let connection: RabbitConnection | null = null;

const getRabbitConnection = async (): Promise<RabbitConnection> => {
  if (!connection) {
    try {
      const rabbitConnection = await amqp.connect(
        process.env.RABBITMQ_URL || "amqp://localhost",
      );

      rabbitConnection.on("close", () => {
        connection = null;
      });

      rabbitConnection.on("error", () => {
        connection = null;
      });

      connection = rabbitConnection;
    } catch (error) {
      console.error("Error connecting to RabbitMQ:", error);
      throw error;
    }
  }

  return connection;
};

export { getRabbitConnection };
