import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";

interface ValidationSchema {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
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
