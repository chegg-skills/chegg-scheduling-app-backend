import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/http/responseHelper";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as teamService from "./team.service";

const createTeam = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const team = await teamService.createTeam(req.body, caller);
  sendSuccessResponse(res, StatusCodes.CREATED, team, "Team created successfully.");
});

const listTeams = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await teamService.listTeams(req.query as any, caller);
  sendSuccessResponse(res, StatusCodes.OK, result, "Teams fetched successfully.");
});

const readTeam = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const team = await teamService.readTeam((req.params as any).teamId, caller);
  sendSuccessResponse(res, StatusCodes.OK, team, "Team fetched successfully.");
});

const updateTeam = asyncHandler(async (req: Request, res: Response) => {
  const team = await teamService.updateTeam((req.params as any).teamId, req.body);
  sendSuccessResponse(res, StatusCodes.OK, team, "Team updated successfully.");
});

const deleteTeam = asyncHandler(async (req: Request, res: Response) => {
  const team = await teamService.deleteTeam((req.params as any).teamId);
  sendSuccessResponse(res, StatusCodes.OK, team, "Team deleted successfully.");
});

export { createTeam, listTeams, readTeam, updateTeam, deleteTeam };
