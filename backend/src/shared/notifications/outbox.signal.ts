import { EventEmitter } from "node:events";

/**
 * In-process signal that a new outbox row is ready to publish. Kept in its own
 * dependency-free module so the publisher (which emits) and the worker (which
 * listens) don't form an import cycle.
 */
export const outboxEmitter = new EventEmitter();

/** Signal the outbox worker to publish now. No-op if the worker was never started (tests). */
export const triggerOutboxProcessing = (): void => {
  outboxEmitter.emit("process");
};
