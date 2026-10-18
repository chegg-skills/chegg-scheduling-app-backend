import http from "node:http";
import express from "express";
import request from "supertest";

// Guards the loopback binding added in tests/setup/jest.setup.ts. Without it, supertest's
// random-port servers can collide with other programs listening on 127.0.0.1 and requests get
// answered by a stranger (see the comment in jest.setup.ts).

const closeServer = (server: http.Server) =>
  new Promise<void>((resolve) => server.close(() => resolve()));

describe("test servers are bound to loopback only", () => {
  it("a server started on a random port listens on 127.0.0.1, not the wildcard address", async () => {
    const server = http.createServer((_req, res) => res.end("ok")).listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    try {
      expect(server.address()).toMatchObject({ address: "127.0.0.1", family: "IPv4" });
    } finally {
      await closeServer(server);
    }
  });

  it("an express app started the way supertest starts it is also loopback-only", async () => {
    const server = express().listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    try {
      expect((server.address() as { address: string }).address).toBe("127.0.0.1");
    } finally {
      await closeServer(server);
    }
  });

  it("supertest still reaches the app through it", async () => {
    const app = express();
    app.get("/ping", (_req, res) => res.json({ pong: true }));
    const res = await request(app).get("/ping");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ pong: true });
  });

  it("leaves explicit listen() calls alone: a given host and a given port are respected", async () => {
    const withHost = http.createServer().listen(0, "0.0.0.0");
    await new Promise((resolve) => withHost.once("listening", resolve));
    try {
      expect((withHost.address() as { address: string }).address).toBe("0.0.0.0");
    } finally {
      await closeServer(withHost);
    }
  });
});
