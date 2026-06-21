import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/http/responseHelper";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as teamMemberService from "./teamMember.service";

const addTeamMember = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const teamId = req.params.teamId as string;
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
});

const listTeamMembers = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const teamId = req.params.teamId as string;
  const result = await teamMemberService.listTeamMembers(teamId, caller);

  sendSuccessResponse(res, StatusCodes.OK, result, "Team members fetched successfully.");
});

const removeTeamMember = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const teamId = req.params.teamId as string;
  const userId = req.params.userId as string;
  const member = await teamMemberService.removeTeamMember(teamId, userId, caller);

  sendSuccessResponse(res, StatusCodes.OK, member, "Team member removed successfully.");
});

export { addTeamMember, listTeamMembers, removeTeamMember };
