import { AsyncLocalStorage } from "node:async_hooks";
import { logger } from "./logger";

interface RequestContext {
  requestId: string;
}

const store = new AsyncLocalStorage<RequestContext>();

// Runs `fn` inside an AsyncLocalStorage context bound to the given requestId.
// Called once per request by `attachRequestContext` middleware — wrapping next()
// ensures the store propagates through all async hops (Promises, DB calls, timers).
export const runWithRequestContext = (requestId: string, fn: () => void): void => {
  store.run({ requestId }, fn);
};

// Returns a child logger with requestId pre-bound, or the root logger outside a request context.
// Uses pino's native (mergeObject, message) call order throughout the codebase.
export const getRequestLogger = () => {
  const ctx = store.getStore();
  return ctx ? logger.child({ requestId: ctx.requestId }) : logger;
};

export const getRequestContext = (): RequestContext | undefined => store.getStore();
