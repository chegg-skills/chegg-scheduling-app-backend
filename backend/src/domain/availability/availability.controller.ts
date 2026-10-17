import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/http/responseHelper";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { asyncHandler } from "../../shared/http/asyncHandler";
import type { CallerContext } from "../../shared/utils/userUtils";
import type { AvailabilityCalendarService } from "./availabilityCalendar.service";

export const createAvailabilityController = (calendarService: AvailabilityCalendarService) => {
  const getWeeklyAvailability = async (req: Request, res: Response) => {
    const caller = res.locals.authUser as CallerContext;
    const { userId } = req.params;
    const slots = await calendarService.getWeeklyAvailability(userId as any, caller);
    sendSuccessResponse(res, StatusCodes.OK, slots, "Weekly availability fetched successfully.");
  };

  const setWeeklyAvailability = async (req: Request, res: Response) => {
    const caller = res.locals.authUser as CallerContext;
    const { userId } = req.params;
    const slots = req.body;
    const result = await calendarService.setWeeklyAvailability(userId as any, slots, caller);
    sendSuccessResponse(res, StatusCodes.OK, result, "Weekly availability updated successfully.");
  };

  const getAvailabilityExceptions = async (req: Request, res: Response) => {
    const caller = res.locals.authUser as CallerContext;
    const { userId } = req.params;
    const exceptions = await calendarService.getAvailabilityExceptions(userId as any, caller);
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      exceptions,
      "Availability exceptions fetched successfully.",
    );
  };

  const addAvailabilityException = async (req: Request, res: Response) => {
    const caller = res.locals.authUser as CallerContext;
    const { userId } = req.params;
    const exception = req.body;
    const result = await calendarService.addAvailabilityException(userId as any, exception, caller);
    sendSuccessResponse(
      res,
      StatusCodes.CREATED,
      result,
      "Availability exception added successfully.",
    );
  };

  const removeAvailabilityException = async (req: Request, res: Response) => {
    const caller = res.locals.authUser as CallerContext;
    const { userId, exceptionId } = req.params;
    await calendarService.removeAvailabilityException(userId as any, exceptionId as any, caller);
    sendSuccessResponse(res, StatusCodes.OK, null, "Availability exception removed successfully.");
  };

  const getEffectiveAvailability = async (req: Request, res: Response) => {
    const caller = res.locals.authUser as CallerContext;
    const { userId } = req.params;
    const from = new Date(req.query.from as string);
    const to = new Date(req.query.to as string);

    const result = await calendarService.getEffectiveAvailabilityData(
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
  };

  return {
    getWeeklyAvailability: asyncHandler(getWeeklyAvailability),
    setWeeklyAvailability: asyncHandler(setWeeklyAvailability),
    getAvailabilityExceptions: asyncHandler(getAvailabilityExceptions),
    addAvailabilityException: asyncHandler(addAvailabilityException),
    removeAvailabilityException: asyncHandler(removeAvailabilityException),
    getEffectiveAvailability: asyncHandler(getEffectiveAvailability),
  };
};

export type AvailabilityController = ReturnType<typeof createAvailabilityController>;
