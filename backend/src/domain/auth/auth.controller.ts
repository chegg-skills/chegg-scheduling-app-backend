import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import * as authService from "./auth.service";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import { setAuthCookie, clearAuthCookie } from "../../shared/utils/cookie";

const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // When self-register is enabled (public endpoint), always force role to
    // COACH — callers must not be able to self-promote to SUPER_ADMIN/TEAM_ADMIN.
    const isSelfRegister = process.env.ALLOW_SELF_REGISTER === "true";
    const data = isSelfRegister ? { ...req.body, role: undefined } : req.body;

    const result = await authService.register(data);
    setAuthCookie(res, result.token);

    sendSuccessResponse(res, StatusCodes.CREATED, result, "User registered successfully.");
  } catch (error) {
    next(error);
  }
};

const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.login(req.body);
    setAuthCookie(res, result.token);

    sendSuccessResponse(res, StatusCodes.OK, result, "Login successful.");
  } catch (error) {
    next(error);
  }
};

const logout = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.logout();
    clearAuthCookie(res);

    sendSuccessResponse(res, StatusCodes.OK, result, "Logout successful.");
  } catch (error) {
    next(error);
  }
};

const bootstrap = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.bootstrap(req.body);
    setAuthCookie(res, result.token);
    sendSuccessResponse(
      res,
      StatusCodes.CREATED,
      result,
      "Super admin created successfully. Bootstrap complete.",
    );
  } catch (error) {
    next(error);
  }
};

export { bootstrap, login, logout, register };
