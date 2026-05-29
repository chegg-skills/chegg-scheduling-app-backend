import { AsyncLocalStorage } from "node:async_hooks";
import { pinoLogger } from "./logger";

interface RequestContext {
  requestId: string;
}

type LogMeta = Record<string, unknown>;

// Wrapped logger shape — matches the (message, meta?) signature of `logger` in logger.ts
// so services can swap `logger` for `getRequestLogger()` with zero call-site changes.
interface WrappedLogger {
  debug: (message: string, meta?: LogMeta) => void;
  info: (message: string, meta?: LogMeta) => void;
  warn: (message: string, meta?: LogMeta) => void;
  error: (message: string, meta?: LogMeta) => void;
  fatal: (message: string, meta?: LogMeta) => void;
}

const wrapChild = (child: ReturnType<typeof pinoLogger.child>): WrappedLogger => ({
  debug: (message, meta) => child.debug(meta ?? {}, message),
  info: (message, meta) => child.info(meta ?? {}, message),
  warn: (message, meta) => child.warn(meta ?? {}, message),
  error: (message, meta) => child.error(meta ?? {}, message),
  fatal: (message, meta) => child.fatal(meta ?? {}, message),
});

// Wrapped root logger — used as fallback outside request context (startup, background jobs).
const rootWrapped = wrapChild(pinoLogger.child({}));

const store = new AsyncLocalStorage<RequestContext>();

/**
 * Runs `fn` inside an AsyncLocalStorage context bound to the given requestId.
 * Called once per request by `attachRequestContext` middleware — wrapping next()
 * ensures the store propagates through all async hops (Promises, DB calls, timers).
 */
export const runWithRequestContext = (requestId: string, fn: () => void): void => {
  store.run({ requestId }, fn);
};

/**
 * Returns a wrapped logger with `requestId` pre-bound (same (message, meta?) API as `logger`).
 * Falls back to the root logger when called outside a request context.
 *
 * Usage in any service:
 *   import { getRequestLogger } from "@/shared/logging/requestContext";
 *   getRequestLogger().info("Booking created", { bookingId });
 */
export const getRequestLogger = (): WrappedLogger => {
  const ctx = store.getStore();
  if (!ctx) return rootWrapped;
  return wrapChild(pinoLogger.child({ requestId: ctx.requestId }));
};

/** Returns the raw context object — use when you need requestId without a logger. */
export const getRequestContext = (): RequestContext | undefined => store.getStore();
