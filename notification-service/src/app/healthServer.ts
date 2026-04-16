import http from "http";
import { config } from "../config/env";

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
    console.log(`Health check server listening on port ${config.health.port}`);
  });

  return server;
}
