import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";
const level = (process.env.LOG_LEVEL ?? "info").toLowerCase();

const transport = isDev
  ? pino.transport({
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    })
  : undefined;

export const logger = pino(
  {
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: { error: pino.stdSerializers.err },
  },
  transport,
);
