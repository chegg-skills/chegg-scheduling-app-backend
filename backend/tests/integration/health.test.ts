import request from "supertest";

import app from "../../src/app";

describe("GET /health", () => {
  it("returns the application health status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(typeof response.body.timestamp).toBe("string");
  });
});

describe("GET /health/ready", () => {
  it("reports readiness with per-dependency checks (DB ok, MQ skipped in test)", async () => {
    const response = await request(app).get("/health/ready");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ready");
    expect(response.body.checks.db).toBe("ok");
    // notifications are disabled under NODE_ENV=test, so MQ is not a required dep
    expect(response.body.checks.mq).toBe("skipped");
  });
});

describe("GET /metrics", () => {
  it("exposes Prometheus metrics", async () => {
    const response = await request(app).get("/metrics");

    expect(response.status).toBe(200);
    expect(response.text).toContain("http_request_duration_seconds");
  });
});
