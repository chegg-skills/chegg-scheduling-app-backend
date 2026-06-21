import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/http/responseHelper";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as service from "./team.notificationConfig.service";

export const getNotificationConfig = asyncHandler(async (req: Request, res: Response) => {
  const { teamId } = req.params;
  const caller = res.locals.authUser as CallerContext;
  const config = await service.getNotificationConfig(teamId as string, caller);
  sendSuccessResponse(
    res,
    StatusCodes.OK,
    config,
    "Notification configuration fetched successfully.",
  );
});

export const upsertNotificationConfig = asyncHandler(async (req: Request, res: Response) => {
  const { teamId } = req.params;
  const caller = res.locals.authUser as CallerContext;
  const config = await service.upsertNotificationConfig(teamId as string, req.body, caller);
  sendSuccessResponse(
    res,
    StatusCodes.OK,
    config,
    "Notification configuration updated successfully.",
  );
});
