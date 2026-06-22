import type { ErrorRequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import { ZodError } from "zod";
import * as Sentry from "@sentry/node";
import { logger } from "../logging/logger";
import { sendErrorResponse } from "../http/responseHelper";
import { MethodNotAllowedError } from "./methodNotAllowed";
import { PathNotFoundError } from "./pathNotFound";
import { isSentryEnabled } from "../../instrument";

/** Report a genuine server-side (5xx) error to Sentry, tagged with the request id
 *  so it lines up with the structured logs. No-op when Sentry is not configured. */
const captureServerError = (err: unknown, requestId?: string): void => {
  if (!isSentryEnabled()) return;
  Sentry.withScope((scope) => {
    if (requestId) scope.setTag("requestId", requestId);
    Sentry.captureException(err);
  });
};

/**
 * Standard application error class. Throw this anywhere in the service or
 * controller layer to produce a structured JSON error response with the given
 * HTTP status code. The global `errorHandler` middleware catches it and calls
 * `sendErrorResponse` — no additional try/catch is needed in controllers.
 *
 * @example
 * throw new ErrorHandler(StatusCodes.NOT_FOUND, "Event not found.");
*/
export class ErrorHandler extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = new.target.name;
    Error.captureStackTrace?.(this, new.target);
  }
}

type FrameworkError = Error & { status?: number; statusCode?: number; type?: string };

const shouldLogClientErrors =
  process.env.NODE_ENV !== "test" && process.env.LOG_CLIENT_ERRORS === "true";

const logClientError = (err: Error, requestId?: string): void => {
  if (shouldLogClientErrors) {
    logger.warn({ requestId, error: err }, "Client request error.");
  }
};

const resolveFrameworkStatus = (err: FrameworkError): number | undefined => {
  if (typeof err.status === "number" && err.status >= 400 && err.status < 600) {
    return err.status;
  }
  if (typeof err.statusCode === "number" && err.statusCode >= 400 && err.statusCode < 600) {
    return err.statusCode;
  }
  return undefined;
};

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const requestId = req.requestId ?? res.locals.requestId;

  if (err instanceof ZodError) {
    logClientError(err, requestId);
    const details = err.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    const message = err.issues[0]?.message ?? "Validation failed";
    return sendErrorResponse(res, StatusCodes.BAD_REQUEST, message, details);
  }

  if (err instanceof PathNotFoundError) {
    logClientError(err, requestId);
    return sendErrorResponse(res, StatusCodes.NOT_FOUND, err.message);
  }

  if (err instanceof MethodNotAllowedError) {
    logClientError(err, requestId);
    return sendErrorResponse(res, StatusCodes.METHOD_NOT_ALLOWED, err.message);
  }

  if (err instanceof ErrorHandler) {
    if (err.statusCode >= 400 && err.statusCode < 500) {
      logClientError(err, requestId);
    } else {
      logger.error({ requestId, error: err }, "Unhandled application error.");
      captureServerError(err, requestId);
    }
    return sendErrorResponse(res, err.statusCode, err.message);
  }

  const frameworkStatus = resolveFrameworkStatus(err as FrameworkError);
  if (frameworkStatus !== undefined) {
    if (frameworkStatus >= 500) {
      logger.error({ requestId, error: err }, "Framework request error.");
      captureServerError(err, requestId);
    } else {
      logClientError(err as Error, requestId);
    }
    return sendErrorResponse(res, frameworkStatus, err.message ?? "Bad request.");
  }

  logger.error({ requestId, error: err }, "Unexpected server error.");
  captureServerError(err, requestId);
  return sendErrorResponse(res, StatusCodes.INTERNAL_SERVER_ERROR, "Internal Server Error");
};
