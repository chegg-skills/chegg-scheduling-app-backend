import net from "node:net";
import { prisma } from "../../src/shared/db/prisma";

/**
 * supertest starts the app for every request with `app.listen(0)`, which binds the wildcard
 * address on a random port from the OS ephemeral range (49152-65535). Other programs on a
 * developer machine (editors, language servers, Electron apps, Postman, ...) listen on
 * 127.0.0.1 inside that same range. The OS lets a wildcard listener and a 127.0.0.1 listener
 * share one port number, and supertest connects to 127.0.0.1:<port> — so now and then a test
 * request is answered by one of those programs ("Invalid CSRF token", a 404, an HTTPS-only
 * error) or is never answered at all, which shows up as failures that look random.
 *
 * Binding the test servers to 127.0.0.1 makes the OS choose a port that is free for that exact
 * address, so such a collision can no longer happen. Only the "random port, no host" call that
 * supertest makes is changed; every other listen() call is passed through untouched.
 */
type Listen = (...args: unknown[]) => net.Server;
type ServerWithListen2 = net.Server & {
  _listen2?: (address: string, port: number, addressType: number, backlog: number) => void;
};
const originalListen = net.Server.prototype.listen as unknown as Listen;

net.Server.prototype.listen = function patchedListen(this: net.Server, ...args: unknown[]) {
  const [first, second] = args;
  const wantsRandomPort = first === 0 || first === "0";
  const noHostGiven = args.length === 1 || typeof second === "function";
  const server = this as ServerWithListen2;
  // listen(port, host) resolves the host asynchronously, but supertest reads server.address()
  // right after listen(0). So bind synchronously through the same step Node itself uses once the
  // host is resolved; if that internal step is ever missing, fall back to the original behaviour.
  if (wantsRandomPort && noHostGiven && typeof server._listen2 === "function") {
    if (typeof second === "function") server.once("listening", second as () => void);
    server._listen2("127.0.0.1", 0, 4, 511);
    return this;
  }
  return originalListen.apply(this, args);
} as typeof net.Server.prototype.listen;

// Disconnect the Prisma client after each test file to avoid open handle warnings.
// Prisma will lazily reconnect for the next file when running --runInBand.
afterAll(async () => {
  await prisma.$disconnect();
});
