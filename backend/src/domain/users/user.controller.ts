import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as userService from "./user.service";

const listUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await userService.listUsers(req.query as any);

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
    const user = await userService.readUser((req.params as any).userId);
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
    const user = await userService.updateUser((req.params as any).userId, req.body, caller);
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
    const user = await userService.deleteUser((req.params as any).userId, caller);
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
