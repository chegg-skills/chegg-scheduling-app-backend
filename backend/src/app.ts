import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import express, { type Request } from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";
import { pathNotFound } from "./shared/error/pathNotFound";
import { errorHandler } from "./shared/error/errorhandler";
import { logger } from "./shared/logging/logger";
import { csrfProtection } from "./shared/middleware/csrf";
import { attachRequestContext } from "./shared/middleware/requestContext";
import { prisma } from "./shared/db/prisma";
import {
  checkRabbitHealthy,
  type DependencyStatus,
} from "./shared/notifications/notification.publisher";
import { registry, metricsMiddleware } from "./shared/observability/metrics";
import { redactSessionToken } from "./shared/utils/redact";
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
  logger: logger,
  // Reuse the request ID already set by attachRequestContext
  genReqId: (req) => (req as Request).requestId ?? randomUUID(),
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req, res) =>
    `${(req as Request).method} ${redactSessionToken((req as Request).url)} ${res.statusCode}`,
  customErrorMessage: (_req, res, err) =>
    `${res.statusCode} ${(err as Error)?.message ?? "Request failed"}`,
  serializers: {
    req: (req) => ({ method: req.method, url: redactSessionToken(req.url ?? "") }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  // Suppress health/metrics endpoints to avoid log noise
  autoLogging: {
    ignore: (req) => {
      const url = (req as Request).url;
      return url === "/health" || url === "/health/ready" || url === "/metrics";
    },
  },
});

const app = express();

// Behind an AWS ALB, req.ip would otherwise resolve to the ALB's internal IP,
// making every request appear to come from the same address and breaking
// per-client rate limiting. '1' = trust exactly one upstream proxy hop.
app.set("trust proxy", 1);

app.use(attachRequestContext);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
  }),
);
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(csrfProtection);
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(httpLogger);
app.use(metricsMiddleware);

// Prometheus scrape endpoint. Optionally protected by METRICS_TOKEN (bearer).
app.get("/metrics", async (req, res) => {
  const token = process.env.METRICS_TOKEN;
  if (token && req.headers.authorization !== `Bearer ${token}`) {
    res.status(401).end();
    return;
  }
  res.set("Content-Type", registry.contentType);
  res.end(await registry.metrics());
});

// Liveness: cheap, no dependency calls — answers "is the process up?"
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Readiness: answers "can this instance serve traffic right now?" by checking its
// dependencies. Orchestrators/load balancers should route on this so an instance
// that loses its DB stops receiving traffic instead of serving 500s.
app.get("/health/ready", async (_req, res) => {
  const checks: { db: DependencyStatus; mq: DependencyStatus } = { db: "down", mq: "skipped" };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = "ok";
  } catch {
    checks.db = "down";
  }

  checks.mq = await checkRabbitHealthy();

  const ready = checks.db === "ok" && checks.mq !== "down";
  res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not_ready", checks });
});

app.use("/api", routes);

app.use(pathNotFound);
app.use(errorHandler);

export default app;
