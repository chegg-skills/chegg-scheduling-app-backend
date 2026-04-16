import type { RequestHandler } from "express";

export class PathNotFoundError extends Error {
  constructor(path: string) {
    super(`Path not found: ${path}`);
    this.name = new.target.name;
  }
}

export const pathNotFound: RequestHandler = (req, _res, next): void => {
  next(new PathNotFoundError(req.path));
};
