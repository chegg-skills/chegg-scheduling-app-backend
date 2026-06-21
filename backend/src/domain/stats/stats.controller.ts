import { type Request, type Response } from "express";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/http/responseHelper";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as statsService from "./stats.service";

export const getBookingStats = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const data = await statsService.getBookingStats(caller, req.query.timeframe as string);
  sendSuccessResponse(res, StatusCodes.OK, data, "Booking stats fetched successfully.");
});

export const getUserStats = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const data = await statsService.getUserStats(caller, req.query.timeframe as string);
  sendSuccessResponse(res, StatusCodes.OK, data, "User stats fetched successfully.");
});

export const getTeamStats = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const data = await statsService.getTeamStats(caller, req.query.timeframe as string);
  sendSuccessResponse(res, StatusCodes.OK, data, "Team stats fetched successfully.");
});

export const getEventStats = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const data = await statsService.getEventStats(
    caller,
    req.query.timeframe as string,
    req.query.teamId as string,
  );
  sendSuccessResponse(res, StatusCodes.OK, data, "Event stats fetched successfully.");
});

export const getEventTypeStats = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const data = await statsService.getEventTypeStats(caller, req.query.timeframe as string);
  sendSuccessResponse(res, StatusCodes.OK, data, "Event type stats fetched successfully.");
});

export const getInteractionTypeStats = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const data = await statsService.getInteractionTypeStats(caller, req.query.timeframe as string);
  sendSuccessResponse(res, StatusCodes.OK, data, "Interaction type stats fetched successfully.");
});

export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const data = await statsService.getDashboardStats(caller, req.query.timeframe as string);
  sendSuccessResponse(res, StatusCodes.OK, data, "Dashboard stats fetched successfully.");
});

export const getBookingTrends = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const data = await statsService.getBookingTrends(caller, req.query.timeframe as string);
  sendSuccessResponse(res, StatusCodes.OK, data, "Booking trends fetched successfully.");
});

export const getTeamPerformance = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const data = await statsService.getTeamPerformance(caller, req.query.timeframe as string);
  sendSuccessResponse(res, StatusCodes.OK, data, "Team performance stats fetched successfully.");
});

export const getPeakActivity = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const data = await statsService.getPeakActivity(caller, req.query.timeframe as string);
  sendSuccessResponse(res, StatusCodes.OK, data, "Peak activity stats fetched successfully.");
});
