import http from "http";
import { config } from "../config/env";
import { logger } from "../logger";

export function createHealthServer(): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(config.health.port, () => {
    logger.info({ port: config.health.port }, "Health check server listening.");
  });

  return server;
}
