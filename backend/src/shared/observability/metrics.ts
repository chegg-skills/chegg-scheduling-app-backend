import { Registry, collectDefaultMetrics, Histogram } from "prom-client";
import type { Request, Response, NextFunction } from "express";

export const registry = new Registry();

// Default process/runtime metrics (event loop lag, heap, GC, etc.)
collectDefaultMetrics({ register: registry });

const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

/**
 * Records request duration labelled by the matched route *pattern* (e.g.
 * `/api/events/:eventId`), not the raw URL — this keeps label cardinality bounded
 * so path params don't explode the metric series.
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const end = httpRequestDuration.startTimer();

  res.on("finish", () => {
    const routePath = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.baseUrl || "unmatched";
    end({ method: req.method, route: routePath, status_code: res.statusCode });
  });

  next();
};
