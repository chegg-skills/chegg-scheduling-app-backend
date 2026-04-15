import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as teamService from "./team.service";

const getTeamIdParam = (req: Request): string => {
  const { teamId } = req.params;
  return Array.isArray(teamId) ? teamId[0] : teamId;
};

const parsePositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
};

const createTeam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const team = await teamService.createTeam(req.body, caller);
    sendSuccessResponse(res, StatusCodes.CREATED, team, "Team created successfully.");
  } catch (error) {
    next(error);
  }
};

const listTeams = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await teamService.listTeams(req.query as any);
    sendSuccessResponse(res, StatusCodes.OK, result, "Teams fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const readTeam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const team = await teamService.readTeam((req.params as any).teamId);
    sendSuccessResponse(res, StatusCodes.OK, team, "Team fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const updateTeam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const team = await teamService.updateTeam((req.params as any).teamId, req.body);
    sendSuccessResponse(res, StatusCodes.OK, team, "Team updated successfully.");
  } catch (error) {
    next(error);
  }
};

const deleteTeam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const team = await teamService.deleteTeam((req.params as any).teamId);
    sendSuccessResponse(res, StatusCodes.OK, team, "Team deleted successfully.");
  } catch (error) {
    next(error);
  }
};

export { createTeam, listTeams, readTeam, updateTeam, deleteTeam };
