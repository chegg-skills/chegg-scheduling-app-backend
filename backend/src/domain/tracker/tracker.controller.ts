import { type NextFunction, type Request, type Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as trackerService from "./tracker.service";

export const getTrackerSlots = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const { date, teamId, eventId } = req.query as {
      date?: string;
      teamId?: string;
      eventId?: string;
    };
    const data = await trackerService.getTrackerSlots(caller, { date, teamId, eventId });
    sendSuccessResponse(res, StatusCodes.OK, data, "Tracker slots fetched successfully.");
  } catch (error) {
    next(error);
  }
};

export const getTrackerFilters = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const data = await trackerService.getTrackerFilters(caller);
    sendSuccessResponse(res, StatusCodes.OK, data, "Tracker filters fetched successfully.");
  } catch (error) {
    next(error);
  }
};
