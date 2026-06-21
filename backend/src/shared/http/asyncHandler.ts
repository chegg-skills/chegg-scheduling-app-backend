import type { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Wraps an async route handler so any thrown error or rejected promise is
 * forwarded to the global `errorHandler` middleware via `next`. Removes the need
 * for a per-handler try/catch in controllers — throw `ErrorHandler` (or let a
 * service rejection propagate) and it lands in the central error handler.
 *
 * @example
 * export const getThing = asyncHandler(async (req, res) => {
 *   const thing = await service.get(req.params.id);
 *   sendSuccessResponse(res, StatusCodes.OK, thing, "Fetched.");
 * });
 */
export const asyncHandler =
  (handler: AsyncRouteHandler): RequestHandler =>
  (req, res, next) => {
    // Promise.resolve(...) tolerates a handler that returns a non-promise,
    // making the wrapper safe even for a synchronous throw.
    Promise.resolve(handler(req, res, next)).catch(next);
  };
