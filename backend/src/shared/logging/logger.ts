type LogLevel = "debug" | "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

const severityRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const configuredLevel = (process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined) ?? "info";
const activeSeverity = severityRank[configuredLevel] ?? severityRank.info;

const serializeError = (value: unknown) => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  return value;
};

const writeLog = (level: LogLevel, message: string, meta?: LogMeta) => {
  if (severityRank[level] < activeSeverity) {
    return;
  }

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ?? {}),
  };

  const line = JSON.stringify(payload, (_key, value) => serializeError(value));

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
};

export const logger = {
  debug: (message: string, meta?: LogMeta) => writeLog("debug", message, meta),
  info: (message: string, meta?: LogMeta) => writeLog("info", message, meta),
  warn: (message: string, meta?: LogMeta) => writeLog("warn", message, meta),
  error: (message: string, meta?: LogMeta) => writeLog("error", message, meta),
};
