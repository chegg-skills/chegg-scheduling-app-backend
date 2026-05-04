import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as service from "./team.notificationConfig.service";

export const getNotificationConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const caller = res.locals.authUser as CallerContext;
    console.log('Fetching notification config', { teamId, caller });
    const config = await service.getNotificationConfig(teamId as string, caller);
    sendSuccessResponse(res, StatusCodes.OK, config, "Notification configuration fetched successfully.");
  } catch (error) {
    next(error);
  }
};

export const upsertNotificationConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const caller = res.locals.authUser as CallerContext;
    const config = await service.upsertNotificationConfig(teamId as string, req.body, caller);
    sendSuccessResponse(res, StatusCodes.OK, config, "Notification configuration updated successfully.");
  } catch (error) {
    next(error);
  }
};
