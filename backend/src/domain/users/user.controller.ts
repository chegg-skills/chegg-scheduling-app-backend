import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as userService from "./user.service";

const getUserIdParam = (req: Request): string => {
  const { userId } = req.params;
  return Array.isArray(userId) ? userId[0] : userId;
};

const parsePositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
};

const listUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = parsePositiveInt(req.query.page);
    const pageSize = parsePositiveInt(req.query.pageSize);
    const result = await userService.listUsers({ page, pageSize });

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      result,
      "Users fetched successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const readUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await userService.readUser(getUserIdParam(req));
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      user,
      "User fetched successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const readMyProfile = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const user = await userService.readUser(caller.id);
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      user,
      "User fetched successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const user = await userService.updateUser(getUserIdParam(req), req.body, caller);
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      user,
      "User updated successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const user = await userService.deleteUser(getUserIdParam(req), caller);
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      user,
      "User deactivated successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const updateMyProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const user = await userService.updateMyProfile(caller.id, req.body);
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      user,
      "Profile updated successfully.",
    );
  } catch (error) {
    next(error);
  }
};

export { deleteUser, listUsers, readMyProfile, readUser, updateUser, updateMyProfile };
