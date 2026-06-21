import { type NextFunction, type Request, type Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/http/responseHelper";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as trackerService from "./tracker.service";

export const getTrackerSlots = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const { date, startDate, endDate, teamId, eventId } = req.query as {
      date?: string;
      startDate?: string;
      endDate?: string;
      teamId?: string;
      eventId?: string;
    };
    const data = await trackerService.getTrackerSlots(caller, { date, startDate, endDate, teamId, eventId });
    sendSuccessResponse(res, StatusCodes.OK, data, "Tracker slots fetched successfully.");
  } catch (error) {
    next(error);
  }
};

export const getSessionDates = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const { startDate, endDate, teamId, eventId } = req.query as {
      startDate: string;
      endDate: string;
      teamId?: string;
      eventId?: string;
    };
    const data = await trackerService.getSessionDates(caller, { startDate, endDate, teamId, eventId });
    sendSuccessResponse(res, StatusCodes.OK, data, "Tracker session dates fetched successfully.");
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
