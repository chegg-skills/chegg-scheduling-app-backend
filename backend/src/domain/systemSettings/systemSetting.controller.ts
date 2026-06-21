import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/http/responseHelper";
import { getSystemSettings, updateSystemSettings } from "./systemSetting.service";

export const getSystemSettingsController = async (_req: Request, res: Response) => {
  const settings = await getSystemSettings();
  return sendSuccessResponse(res, StatusCodes.OK, { settings });
};

export const updateSystemSettingsController = async (req: Request, res: Response) => {
  const settings = await updateSystemSettings(req.body);
  return sendSuccessResponse(res, StatusCodes.OK, { settings }, "System settings updated.");
};
