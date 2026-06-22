import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { StatusCodes } from "http-status-codes";
import * as authService from "./auth.service";
import { sendSuccessResponse } from "../../shared/http/responseHelper";
import { setAuthCookie, clearAuthCookie } from "../../shared/auth/cookie";

const register = async (req: Request, res: Response) => {
  // When self-register is enabled (public endpoint), always force role to
  // COACH — callers must not be able to self-promote to SUPER_ADMIN/TEAM_ADMIN.
  const isSelfRegister = process.env.ALLOW_SELF_REGISTER === "true";
  const data = isSelfRegister ? { ...req.body, role: undefined } : req.body;

  const result = await authService.register(data);
  const csrfToken = setAuthCookie(res, result.token);

  sendSuccessResponse(
    res,
    StatusCodes.CREATED,
    { ...result, csrfToken },
    "User registered successfully.",
  );
};

const login = async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  const csrfToken = setAuthCookie(res, result.token);

  sendSuccessResponse(res, StatusCodes.OK, { ...result, csrfToken }, "Login successful.");
};

const logout = async (_req: Request, res: Response) => {
  const result = await authService.logout();
  clearAuthCookie(res);

  sendSuccessResponse(res, StatusCodes.OK, result, "Logout successful.");
};

const bootstrap = async (req: Request, res: Response) => {
  const result = await authService.bootstrap(req.body);
  const csrfToken = setAuthCookie(res, result.token);
  sendSuccessResponse(
    res,
    StatusCodes.CREATED,
    { ...result, csrfToken },
    "Super admin created successfully. Bootstrap complete.",
  );
};

export default {
  register: asyncHandler(register),
  login: asyncHandler(login),
  logout: asyncHandler(logout),
  bootstrap: asyncHandler(bootstrap),
};
