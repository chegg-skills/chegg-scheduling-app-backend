import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const REQUEST_ID_HEADER = "x-request-id";

export const attachRequestContext = (req: Request, res: Response, next: NextFunction): void => {
  const incomingRequestId = req.header(REQUEST_ID_HEADER);
  const requestId =
    typeof incomingRequestId === "string" && incomingRequestId.trim().length > 0
      ? incomingRequestId.trim()
      : randomUUID();

  req.requestId = requestId;
  res.locals.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);

  next();
};
