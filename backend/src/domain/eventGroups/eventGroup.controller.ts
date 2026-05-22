import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as eventGroupService from "./eventGroup.service";

const createEventGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const { teamId } = req.params as { teamId: string };
    const group = await eventGroupService.createEventGroup(teamId, req.body, caller);
    sendSuccessResponse(res, StatusCodes.CREATED, group, "Event group created successfully.");
  } catch (error) {
    next(error);
  }
};

const listTeamEventGroups = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const { teamId } = req.params as { teamId: string };
    const groups = await eventGroupService.listTeamEventGroups(teamId, caller);
    sendSuccessResponse(res, StatusCodes.OK, { groups }, "Event groups fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const readEventGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const { groupId } = req.params as { groupId: string };
    const group = await eventGroupService.readEventGroup(groupId, caller);
    sendSuccessResponse(res, StatusCodes.OK, group, "Event group fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const updateEventGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const { groupId } = req.params as { groupId: string };
    const group = await eventGroupService.updateEventGroup(groupId, req.body, caller);
    sendSuccessResponse(res, StatusCodes.OK, group, "Event group updated successfully.");
  } catch (error) {
    next(error);
  }
};

const deleteEventGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const { groupId } = req.params as { groupId: string };
    await eventGroupService.deleteEventGroup(groupId, caller);
    sendSuccessResponse(res, StatusCodes.OK, null, "Event group deleted successfully.");
  } catch (error) {
    next(error);
  }
};

export {
  createEventGroup,
  listTeamEventGroups,
  readEventGroup,
  updateEventGroup,
  deleteEventGroup,
};
