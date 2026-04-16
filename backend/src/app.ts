import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import express, { type Request } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { pathNotFound } from "./shared/error/pathNotFound";
import { errorHandler } from "./shared/error/errorhandler";
import { logger } from "./shared/logging/logger";
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

morgan.token("request-id", (req) => (req as Request).requestId ?? "-");

const requestLogFormat = isProduction
  ? ":remote-addr :method :url :status :res[content-length] - :response-time ms reqId=:request-id"
  : ":method :url :status :response-time ms reqId=:request-id";

const app = express();

app.use(attachRequestContext);
app.use(helmet());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(csrfProtection);
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(morgan(requestLogFormat));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", routes);

app.use(pathNotFound);
app.use(errorHandler);

export default app;
