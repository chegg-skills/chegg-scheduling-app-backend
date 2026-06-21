import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/http/responseHelper";
import type { CallerContext } from "../../shared/utils/userUtils";
import { CSRF_COOKIE_NAME } from "../../shared/auth/cookie";
import * as userService from "./user.service";

const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.listUsers({
    page: req.query.page ? Number(req.query.page) : undefined,
    pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    search: typeof req.query.search === "string" ? req.query.search : undefined,
    role: typeof req.query.role === "string" ? req.query.role : undefined,
  });

  sendSuccessResponse(res, StatusCodes.OK, result, "Users fetched successfully.");
});

const readUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.readUser(req.params.userId as string);
  sendSuccessResponse(res, StatusCodes.OK, user, "User fetched successfully.");
});

const readMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const user = await userService.readUser(caller.id);
  const csrfToken: string | undefined = req.cookies[CSRF_COOKIE_NAME];
  sendSuccessResponse(res, StatusCodes.OK, { ...user, csrfToken }, "User fetched successfully.");
});

const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const user = await userService.updateUser(req.params.userId as string, req.body, caller);
  sendSuccessResponse(res, StatusCodes.OK, user, "User updated successfully.");
});

const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const user = await userService.deleteUser(req.params.userId as string, caller);
  sendSuccessResponse(res, StatusCodes.OK, user, "User deactivated successfully.");
});

const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const user = await userService.updateMyProfile(caller.id, req.body);
  sendSuccessResponse(res, StatusCodes.OK, user, "Profile updated successfully.");
});

export { deleteUser, listUsers, readMyProfile, readUser, updateUser, updateMyProfile };
