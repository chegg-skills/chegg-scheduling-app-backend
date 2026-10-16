import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/http/responseHelper";
import type { SystemSettingService } from "./systemSetting.service";

export const createSystemSettingController = (settingService: SystemSettingService) => {
  const getSystemSettingsController = async (_req: Request, res: Response) => {
    const settings = await settingService.getSystemSettings();
    return sendSuccessResponse(res, StatusCodes.OK, { settings });
  };

  const updateSystemSettingsController = async (req: Request, res: Response) => {
    const settings = await settingService.updateSystemSettings(req.body);
    return sendSuccessResponse(res, StatusCodes.OK, { settings }, "System settings updated.");
  };

  return {
    getSystemSettingsController: asyncHandler(getSystemSettingsController),
    updateSystemSettingsController: asyncHandler(updateSystemSettingsController),
  };
};

export type SystemSettingController = ReturnType<typeof createSystemSettingController>;
