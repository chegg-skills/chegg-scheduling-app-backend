import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { StatusCodes } from "http-status-codes";
import * as authService from "./auth.service";
import { sendSuccessResponse } from "../../shared/http/responseHelper";
import {
  setAuthCookie,
  clearAuthCookie,
  setRefreshCookie,
  REFRESH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  clearSessionCookies,
} from "../../shared/auth/cookie";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { establishRefreshSession } from "../../shared/auth/session";

const register = async (req: Request, res: Response) => {
  // When self-register is enabled (public endpoint), always force role to
  // COACH — callers must not be able to self-promote to SUPER_ADMIN/TEAM_ADMIN.
  const isSelfRegister = process.env.ALLOW_SELF_REGISTER === "true";
  const data = isSelfRegister ? { ...req.body, role: undefined } : req.body;

  const result = await authService.register(data);
  const csrfToken = setAuthCookie(res, result.token);
  await establishRefreshSession(req, res, result.user.id);

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
  await establishRefreshSession(req, res, result.user.id);

  sendSuccessResponse(res, StatusCodes.OK, { ...result, csrfToken }, "Login successful.");
};

/**
 * Exchanges the refresh cookie for a fresh access token and rotates the refresh
 * token. The rotated refresh token is deliberately returned only as an httpOnly
 * cookie and never in the response body.
 */
const refresh = async (req: Request, res: Response) => {
  let result: Awaited<ReturnType<typeof authService.refresh>>;

  try {
    result = await authService.refresh(req.cookies?.[REFRESH_COOKIE_NAME], {
      userAgent: req.get("user-agent") ?? null,
      ipAddress: req.ip ?? null,
    });
  } catch (error) {
    // Intentional catch-and-rethrow (cf. sso.controller's handleCallback): a rejected
    // refresh means the cookie is dead, so drop it rather than let the browser re-send
    // it on every request for the next 30 days. Narrowed to 401 on purpose — a
    // transient failure inside the rotation transaction must not destroy a valid session.
    if (error instanceof ErrorHandler && error.statusCode === StatusCodes.UNAUTHORIZED) {
      clearSessionCookies(res);
    }
    throw error;
  }

  // Preserve the current CSRF token rather than rotating it — see setAuthCookie.
  const csrfToken = setAuthCookie(res, result.token, req.cookies?.[CSRF_COOKIE_NAME]);
  setRefreshCookie(res, result.refreshToken);

  sendSuccessResponse(
    res,
    StatusCodes.OK,
    { user: result.user, token: result.token, csrfToken },
    "Session refreshed.",
  );
};

const logout = async (req: Request, res: Response) => {
  const result = await authService.logout(req.cookies?.[REFRESH_COOKIE_NAME]);
  clearAuthCookie(res);

  sendSuccessResponse(res, StatusCodes.OK, result, "Logout successful.");
};

const bootstrap = async (req: Request, res: Response) => {
  const result = await authService.bootstrap(req.body);
  const csrfToken = setAuthCookie(res, result.token);
  await establishRefreshSession(req, res, result.user.id);
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
  refresh: asyncHandler(refresh),
  logout: asyncHandler(logout),
  bootstrap: asyncHandler(bootstrap),
};
