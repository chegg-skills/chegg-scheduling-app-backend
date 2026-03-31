import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as teamMemberService from "./teamMember.service";

const getTeamIdParam = (req: Request): string => {
  const { teamId } = req.params;
  return Array.isArray(teamId) ? teamId[0] : teamId;
};

const getUserIdParam = (req: Request): string => {
  const { userId } = req.params;
  return Array.isArray(userId) ? userId[0] : userId;
};

const addTeamMember = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const teamId = getTeamIdParam(req);
    const { userId, userIds } = req.body;

    let result;
    if (userIds && Array.isArray(userIds)) {
      result = await teamMemberService.addTeamMembers(teamId, { userIds }, caller);
    } else {
      result = await teamMemberService.addTeamMember(teamId, { userId }, caller);
    }

    sendSuccessResponse(
      res,
      StatusCodes.CREATED,
      result,
      userIds ? "Team members added successfully." : "Team member added successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const listTeamMembers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const result = await teamMemberService.listTeamMembers(
      getTeamIdParam(req),
      caller,
    );

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      result,
      "Team members fetched successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const removeTeamMember = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const member = await teamMemberService.removeTeamMember(
      getTeamIdParam(req),
      getUserIdParam(req),
      caller,
    );

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      member,
      "Team member removed successfully.",
    );
  } catch (error) {
    next(error);
  }
};

export { addTeamMember, listTeamMembers, removeTeamMember };