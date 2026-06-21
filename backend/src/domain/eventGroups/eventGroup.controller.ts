import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/http/responseHelper";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as eventGroupService from "./eventGroup.service";

const createEventGroup = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const { teamId } = req.params as { teamId: string };
  const group = await eventGroupService.createEventGroup(teamId, req.body, caller);
  sendSuccessResponse(res, StatusCodes.CREATED, group, "Event group created successfully.");
});

const listTeamEventGroups = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const { teamId } = req.params as { teamId: string };
  const groups = await eventGroupService.listTeamEventGroups(teamId, caller);
  sendSuccessResponse(res, StatusCodes.OK, { groups }, "Event groups fetched successfully.");
});

const readEventGroup = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const { groupId } = req.params as { groupId: string };
  const group = await eventGroupService.readEventGroup(groupId, caller);
  sendSuccessResponse(res, StatusCodes.OK, group, "Event group fetched successfully.");
});

const updateEventGroup = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const { groupId } = req.params as { groupId: string };
  const group = await eventGroupService.updateEventGroup(groupId, req.body, caller);
  sendSuccessResponse(res, StatusCodes.OK, group, "Event group updated successfully.");
});

const deleteEventGroup = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const { groupId } = req.params as { groupId: string };
  await eventGroupService.deleteEventGroup(groupId, caller);
  sendSuccessResponse(res, StatusCodes.OK, null, "Event group deleted successfully.");
});

export {
  createEventGroup,
  listTeamEventGroups,
  readEventGroup,
  updateEventGroup,
  deleteEventGroup,
};
