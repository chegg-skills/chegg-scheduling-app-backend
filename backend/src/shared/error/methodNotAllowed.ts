import type { RequestHandler } from "express";

export class MethodNotAllowedError extends Error {
  constructor(method: string) {
    super(`Method not allowed: ${method}`);
    this.name = new.target.name;
  }
}

export const methodNotAllowed: RequestHandler = (req, _res, next): void => {
  next(new MethodNotAllowedError(req.method));
};
