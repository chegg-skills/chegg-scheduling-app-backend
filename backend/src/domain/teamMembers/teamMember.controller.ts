import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/http/responseHelper";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as teamMemberService from "./teamMember.service";

const addTeamMember = async (req: Request, res: Response) => {
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
};

const listTeamMembers = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const teamId = req.params.teamId as string;
  const result = await teamMemberService.listTeamMembers(teamId, caller);

  sendSuccessResponse(res, StatusCodes.OK, result, "Team members fetched successfully.");
};

const removeTeamMember = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const teamId = req.params.teamId as string;
  const userId = req.params.userId as string;
  const member = await teamMemberService.removeTeamMember(teamId, userId, caller);

  sendSuccessResponse(res, StatusCodes.OK, member, "Team member removed successfully.");
};

const getTeamMemberWorkload = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const workload = await teamMemberService.getTeamMemberWorkload(req.params.teamId as string, caller);
  sendSuccessResponse(res, StatusCodes.OK, { workload }, "Team member workload fetched.");
};

export default {
  addTeamMember: asyncHandler(addTeamMember),
  listTeamMembers: asyncHandler(listTeamMembers),
  removeTeamMember: asyncHandler(removeTeamMember),
  getTeamMemberWorkload: asyncHandler(getTeamMemberWorkload),
};
