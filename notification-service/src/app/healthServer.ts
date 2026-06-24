import http from "http";
import { config } from "../config/env";
import { logger } from "../logger";
import { prisma } from "../db/prisma";
import { isRabbitConnected } from "../queues/rabbitmq";

/**
 * Liveness (`/health`): the process is up. Always 200 — used by the container liveness probe.
 * Readiness (`/ready`): the service can actually do work — DB reachable and RabbitMQ connected.
 * Returns 503 when a dependency is down so the orchestrator can hold traffic/restarts.
 */
const checkReadiness = async (): Promise<{ ok: boolean; db: boolean; rabbitmq: boolean }> => {
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch (error) {
    logger.warn({ error }, "Readiness: database ping failed.");
  }

  const rabbitmq = isRabbitConnected();
  return { ok: db && rabbitmq, db, rabbitmq };
};

export function createHealthServer(): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
      return;
    }

    if (req.url === "/ready" && req.method === "GET") {
      void checkReadiness().then((result) => {
        res.writeHead(result.ok ? 200 : 503, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: result.ok ? "ready" : "not_ready",
            dependencies: { database: result.db, rabbitmq: result.rabbitmq },
            timestamp: new Date().toISOString(),
          }),
        );
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(config.health.port, () => {
    logger.info({ port: config.health.port }, "Health check server listening.");
  });

  return server;
}
