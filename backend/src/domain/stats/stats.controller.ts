import { type Request, type Response } from "express";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/http/responseHelper";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as statsService from "./stats.service";

const getBookingStats = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const data = await statsService.getBookingStats(caller, req.query.timeframe as string);
  sendSuccessResponse(res, StatusCodes.OK, data, "Booking stats fetched successfully.");
};

const getUserStats = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const data = await statsService.getUserStats(caller, req.query.timeframe as string);
  sendSuccessResponse(res, StatusCodes.OK, data, "User stats fetched successfully.");
};

const getTeamStats = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const data = await statsService.getTeamStats(caller, req.query.timeframe as string);
  sendSuccessResponse(res, StatusCodes.OK, data, "Team stats fetched successfully.");
};

const getEventStats = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const data = await statsService.getEventStats(
    caller,
    req.query.timeframe as string,
    req.query.teamId as string,
  );
  sendSuccessResponse(res, StatusCodes.OK, data, "Event stats fetched successfully.");
};

const getEventTypeStats = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const data = await statsService.getEventTypeStats(caller, req.query.timeframe as string);
  sendSuccessResponse(res, StatusCodes.OK, data, "Event type stats fetched successfully.");
};

const getInteractionTypeStats = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const data = await statsService.getInteractionTypeStats(caller, req.query.timeframe as string);
  sendSuccessResponse(res, StatusCodes.OK, data, "Interaction type stats fetched successfully.");
};

const getDashboardStats = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const data = await statsService.getDashboardStats(caller, req.query.timeframe as string);
  sendSuccessResponse(res, StatusCodes.OK, data, "Dashboard stats fetched successfully.");
};

const getBookingTrends = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const data = await statsService.getBookingTrends(caller, req.query.timeframe as string);
  sendSuccessResponse(res, StatusCodes.OK, data, "Booking trends fetched successfully.");
};

const getTeamPerformance = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const data = await statsService.getTeamPerformance(caller, req.query.timeframe as string);
  sendSuccessResponse(res, StatusCodes.OK, data, "Team performance stats fetched successfully.");
};

const getPeakActivity = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const data = await statsService.getPeakActivity(caller, req.query.timeframe as string);
  sendSuccessResponse(res, StatusCodes.OK, data, "Peak activity stats fetched successfully.");
};

export default {
  getBookingStats: asyncHandler(getBookingStats),
  getUserStats: asyncHandler(getUserStats),
  getTeamStats: asyncHandler(getTeamStats),
  getEventStats: asyncHandler(getEventStats),
  getEventTypeStats: asyncHandler(getEventTypeStats),
  getInteractionTypeStats: asyncHandler(getInteractionTypeStats),
  getDashboardStats: asyncHandler(getDashboardStats),
  getBookingTrends: asyncHandler(getBookingTrends),
  getTeamPerformance: asyncHandler(getTeamPerformance),
  getPeakActivity: asyncHandler(getPeakActivity),
};
