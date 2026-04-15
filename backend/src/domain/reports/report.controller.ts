import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import * as reportService from "./report.service";
import type { CallerContext } from "../../shared/utils/userUtils";
import { sendFileResponse } from "../../shared/utils/helper/responseHelper";

export const downloadBookingsReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const timeframe = typeof req.query.timeframe === "string" ? req.query.timeframe : undefined;
    const { csv, filename } = await reportService.getBookingsReport(caller, timeframe);

    sendFileResponse(res, StatusCodes.OK, csv, "text/csv", filename);
  } catch (error) {
    next(error);
  }
};

export const downloadPerformanceReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const timeframe = typeof req.query.timeframe === "string" ? req.query.timeframe : undefined;
    const { csv, filename } = await reportService.getPerformanceReport(caller, timeframe);

    sendFileResponse(res, StatusCodes.OK, csv, "text/csv", filename);
  } catch (error) {
    next(error);
  }
};

export const downloadStudentReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const timeframe = typeof req.query.timeframe === "string" ? req.query.timeframe : undefined;
    const { csv, filename } = await reportService.getStudentReport(caller, timeframe);

    sendFileResponse(res, StatusCodes.OK, csv, "text/csv", filename);
  } catch (error) {
    next(error);
  }
};
