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

export const pinoLogger = pino(
  {
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: {
      // Maps the existing { error: err } call pattern to pino's standard error serializer
      error: pino.stdSerializers.err,
    },
  },
  transport,
);

type LogMeta = Record<string, unknown>;

// Wraps pinoLogger to preserve the existing call signature used throughout the codebase:
//   logger.info("message", { key: value })
// Pino's native order is (mergeObject, message) — the wrapper inverts it so no consumers change.
export const logger = {
  debug: (message: string, meta?: LogMeta) => pinoLogger.debug(meta ?? {}, message),
  info: (message: string, meta?: LogMeta) => pinoLogger.info(meta ?? {}, message),
  warn: (message: string, meta?: LogMeta) => pinoLogger.warn(meta ?? {}, message),
  error: (message: string, meta?: LogMeta) => pinoLogger.error(meta ?? {}, message),
  fatal: (message: string, meta?: LogMeta) => pinoLogger.fatal(meta ?? {}, message),
};
