import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { StatusCodes } from "http-status-codes";
import * as reportService from "./report.service";
import type { CallerContext } from "../../shared/utils/userUtils";
import { sendFileResponse } from "../../shared/http/responseHelper";

export const downloadBookingsReport = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const timeframe = typeof req.query.timeframe === "string" ? req.query.timeframe : undefined;
  const { csv, filename } = await reportService.getBookingsReport(caller, timeframe);

  sendFileResponse(res, StatusCodes.OK, csv, "text/csv", filename);
});

export const downloadPerformanceReport = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const timeframe = typeof req.query.timeframe === "string" ? req.query.timeframe : undefined;
  const { csv, filename } = await reportService.getPerformanceReport(caller, timeframe);

  sendFileResponse(res, StatusCodes.OK, csv, "text/csv", filename);
});

export const downloadStudentReport = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const timeframe = typeof req.query.timeframe === "string" ? req.query.timeframe : undefined;
  const { csv, filename } = await reportService.getStudentReport(caller, timeframe);

  sendFileResponse(res, StatusCodes.OK, csv, "text/csv", filename);
});
