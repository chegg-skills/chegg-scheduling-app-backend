import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import express, { type Request } from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";
import { pathNotFound } from "./shared/error/pathNotFound";
import { errorHandler } from "./shared/error/errorhandler";
import { logger, pinoLogger } from "./shared/logging/logger";
import { csrfProtection } from "./shared/middleware/csrf";
import { attachRequestContext } from "./shared/middleware/requestContext";
import routes from "./routes/index";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

if (isProduction && allowedOrigins.length === 0) {
  logger.warn("CORS_ORIGINS is empty in production; only same-origin requests will be accepted.");
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.length === 0) {
      callback(null, !isProduction);
      return;
    }

    callback(null, allowedOrigins.includes(origin));
  },
  credentials: true,
};

const httpLogger = pinoHttp({
  logger: pinoLogger,
  // Reuse the request ID already set by attachRequestContext
  genReqId: (req) => (req as Request).requestId ?? randomUUID(),
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req, res) =>
    `${(req as Request).method} ${(req as Request).url} ${res.statusCode}`,
  customErrorMessage: (_req, res, err) =>
    `${res.statusCode} ${(err as Error)?.message ?? "Request failed"}`,
  serializers: {
    req: (req) => ({ method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  // Suppress health check endpoint to avoid log noise
  autoLogging: { ignore: (req) => (req as Request).url === "/health" },
});

const app = express();

app.use(attachRequestContext);
app.use(helmet());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(csrfProtection);
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(httpLogger);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", routes);

app.use(pathNotFound);
app.use(errorHandler);

export default app;
