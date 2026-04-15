import { Request, Response, NextFunction } from "express";
import { ZodError, ZodTypeAny } from "zod";
import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../error/errorhandler";

interface ValidationSchema {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export const validate = (schema: ValidationSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.params) {
        const validatedParams = await schema.params.parseAsync(req.params);
        Object.defineProperty(req, "params", {
          value: validatedParams,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
      if (schema.query) {
        const validatedQuery = await schema.query.parseAsync(req.query);
        Object.defineProperty(req, "query", {
          value: validatedQuery,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
};
