import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import { ErrorHandler } from "../../shared/error/errorhandler";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as availabilityService from "./availability.service";

const getUserIdParam = (req: Request): string => {
  const { userId } = req.params;
  return Array.isArray(userId) ? userId[0] : userId;
};

const getExceptionIdParam = (req: Request): string => {
  const { exceptionId } = req.params;
  return Array.isArray(exceptionId) ? exceptionId[0] : exceptionId;
};

const parseDate = (value: unknown): Date | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
};

const getWeeklyAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const userId = getUserIdParam(req);
    const slots = await availabilityService.getWeeklyAvailability(userId, caller);
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      slots,
      "Weekly availability fetched successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const setWeeklyAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const userId = getUserIdParam(req);
    const slots = req.body;
    const result = await availabilityService.setWeeklyAvailability(userId, slots, caller);
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      result,
      "Weekly availability updated successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const getAvailabilityExceptions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const userId = getUserIdParam(req);
    const exceptions = await availabilityService.getAvailabilityExceptions(userId, caller);
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      exceptions,
      "Availability exceptions fetched successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const addAvailabilityException = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const userId = getUserIdParam(req);
    const exception = req.body;
    const result = await availabilityService.addAvailabilityException(userId, exception, caller);
    sendSuccessResponse(
      res,
      StatusCodes.CREATED,
      result,
      "Availability exception added successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const removeAvailabilityException = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const userId = getUserIdParam(req);
    const exceptionId = getExceptionIdParam(req);
    await availabilityService.removeAvailabilityException(userId, exceptionId, caller);
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      null,
      "Availability exception removed successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const getEffectiveAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const userId = getUserIdParam(req);
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);

    if (!from || !to) {
      throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Valid 'from' and 'to' date parameters are required.");
    }

    const result = await availabilityService.getEffectiveAvailability(
      userId,
      from,
      to,
      caller,
    );
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      result,
      "Effective availability calculated successfully.",
    );
  } catch (error) {
    next(error);
  }
};

export {
  getWeeklyAvailability,
  setWeeklyAvailability,
  getAvailabilityExceptions,
  addAvailabilityException,
  removeAvailabilityException,
  getEffectiveAvailability,
};
