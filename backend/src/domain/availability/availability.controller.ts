import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import { ErrorHandler } from "../../shared/error/errorhandler";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as availabilityService from "./availability.service";

const getWeeklyAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const { userId } = req.params;
    const slots = await availabilityService.getWeeklyAvailability(userId as any, caller);
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
    const { userId } = req.params;
    const slots = req.body;
    const result = await availabilityService.setWeeklyAvailability(userId as any, slots, caller);
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
    const { userId } = req.params;
    const exceptions = await availabilityService.getAvailabilityExceptions(userId as any, caller);
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
    const { userId } = req.params;
    const exception = req.body;
    const result = await availabilityService.addAvailabilityException(userId as any, exception, caller);
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
    const { userId, exceptionId } = req.params;
    await availabilityService.removeAvailabilityException(userId as any, exceptionId as any, caller);
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
    const { userId } = req.params;
    const from = new Date(req.query.from as string);
    const to = new Date(req.query.to as string);

    const result = await availabilityService.getEffectiveAvailability(
      userId as any,
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
