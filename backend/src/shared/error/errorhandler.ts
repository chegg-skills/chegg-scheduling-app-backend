import type { ErrorRequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
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

// Express body-parser attaches a `status` or `statusCode` field to some errors
// (e.g. 400 for malformed JSON, 413 for payload too large).
type FrameworkError = Error & { status?: number; statusCode?: number; type?: string };

const resolveFrameworkStatus = (err: FrameworkError): number | undefined => {
  if (typeof err.status === "number" && err.status >= 400 && err.status < 600) {
    return err.status;
  }
  if (typeof err.statusCode === "number" && err.statusCode >= 400 && err.statusCode < 600) {
    return err.statusCode;
  }
  return undefined;
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  // If headers were already sent, delegate to Express default handler
  // to avoid "Cannot set headers after they are sent" crashes.
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof PathNotFoundError) {
    console.warn(err);
    return sendErrorResponse(res, StatusCodes.NOT_FOUND, err.message);
  }

  if (err instanceof MethodNotAllowedError) {
    console.warn(err);
    return sendErrorResponse(res, StatusCodes.METHOD_NOT_ALLOWED, err.message);
  }

  if (err instanceof ErrorHandler) {
    // 4xx = expected / client errors → warn; 5xx = server faults → error
    if (err.statusCode >= 400 && err.statusCode < 500) {
      console.warn(err);
    } else {
      console.error(err);
    }
    return sendErrorResponse(res, err.statusCode, err.message);
  }

  // Handle framework errors: malformed JSON (400), payload too large (413), etc.
  const frameworkStatus = resolveFrameworkStatus(err as FrameworkError);
  if (frameworkStatus !== undefined) {
    console.warn(err);
    return sendErrorResponse(
      res,
      frameworkStatus,
      err.message ?? "Bad request."
    );
  }

  // Truly unexpected error — always log at error level
  console.error(err);
  return sendErrorResponse(
    res,
    StatusCodes.INTERNAL_SERVER_ERROR,
    "Internal Server Error"
  );
};
