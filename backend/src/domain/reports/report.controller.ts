import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { StatusCodes } from "http-status-codes";
import * as reportService from "./report.service";
import type { CallerContext } from "../../shared/utils/userUtils";
import { sendFileResponse } from "../../shared/http/responseHelper";

const downloadBookingsReport = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const timeframe = typeof req.query.timeframe === "string" ? req.query.timeframe : undefined;
  const format = req.query.format;
  const { data, csv, filename } = await reportService.getBookingsReport(caller, timeframe);

  if (format === "json") {
    res.status(StatusCodes.OK).json({ success: true, data });
  } else {
    sendFileResponse(res, StatusCodes.OK, csv, "text/csv", filename);
  }
};

const downloadPerformanceReport = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const timeframe = typeof req.query.timeframe === "string" ? req.query.timeframe : undefined;
  const format = req.query.format;
  const { data, csv, filename } = await reportService.getPerformanceReport(caller, timeframe);

  if (format === "json") {
    res.status(StatusCodes.OK).json({ success: true, data });
  } else {
    sendFileResponse(res, StatusCodes.OK, csv, "text/csv", filename);
  }
};

const downloadStudentReport = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const timeframe = typeof req.query.timeframe === "string" ? req.query.timeframe : undefined;
  const format = req.query.format;
  const { data, csv, filename } = await reportService.getStudentReport(caller, timeframe);

  if (format === "json") {
    res.status(StatusCodes.OK).json({ success: true, data });
  } else {
    sendFileResponse(res, StatusCodes.OK, csv, "text/csv", filename);
  }
};

export default {
  downloadBookingsReport: asyncHandler(downloadBookingsReport),
  downloadPerformanceReport: asyncHandler(downloadPerformanceReport),
  downloadStudentReport: asyncHandler(downloadStudentReport),
};
