import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as teamMemberService from "./teamMember.service";

const addTeamMember = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const { teamId } = req.params;
    const { userId, userIds } = req.body;

    let result;
    if (userIds && Array.isArray(userIds)) {
      result = await teamMemberService.addTeamMembers(teamId as any, { userIds }, caller);
    } else {
      result = await teamMemberService.addTeamMember(teamId as any, { userId }, caller);
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
    const { teamId } = req.params;
    const result = await teamMemberService.listTeamMembers(
      teamId as any,
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
    const { teamId, userId } = req.params;
    const member = await teamMemberService.removeTeamMember(
      teamId as any,
      userId as any,
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