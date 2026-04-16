import type { ErrorRequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import { ZodError } from "zod";
import { logger } from "../logging/logger";
import { sendErrorResponse } from "../utils/helper/responseHelper";
import { MethodNotAllowedError } from "./methodNotAllowed";
import { PathNotFoundError } from "./pathNotFound";

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
    logger.warn("Client request error", { requestId, error: err });
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
      logger.error("Unhandled application error", { requestId, error: err });
    }
    return sendErrorResponse(res, err.statusCode, err.message);
  }

  const frameworkStatus = resolveFrameworkStatus(err as FrameworkError);
  if (frameworkStatus !== undefined) {
    if (frameworkStatus >= 500) {
      logger.error("Framework request error", { requestId, error: err });
    } else {
      logClientError(err as Error, requestId);
    }
    return sendErrorResponse(res, frameworkStatus, err.message ?? "Bad request.");
  }

  logger.error("Unexpected server error", { requestId, error: err });
  return sendErrorResponse(res, StatusCodes.INTERNAL_SERVER_ERROR, "Internal Server Error");
};
