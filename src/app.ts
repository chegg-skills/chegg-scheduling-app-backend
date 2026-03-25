import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { pathNotFound } from "./shared/error/pathNotFound";
import { errorHandler } from "./shared/error/errorhandler";
import routes from "./routes/index";


const isProduction = process.env.NODE_ENV === "production";

const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

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


const app = express();

app.use(helmet());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Health check — must be before auth routes so it is always reachable
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Main API routes
app.use("/api", routes);

app.use(pathNotFound);
app.use(errorHandler);


export default app;