import { prisma } from "./prisma";
import type { DbClient } from "./repository";

/**
 * Injectable transaction boundary. Services own *what* must be atomic; the runner owns
 * *how*. Production wraps `prisma.$transaction` (default options, as before); unit tests
 * pass a fake that simply invokes the callback.
 */
export interface TxRunner {
  run<T>(fn: (tx: DbClient) => Promise<T>): Promise<T>;
}

export const createTxRunner = (): TxRunner => ({
  run: (fn) => prisma.$transaction((tx) => fn(tx)),
});
