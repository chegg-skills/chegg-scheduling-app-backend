import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as sessionTypeService from "./sessionType.service";

const createSessionType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const sessionType = await sessionTypeService.createSessionType(req.body, caller);
    sendSuccessResponse(res, StatusCodes.CREATED, { sessionType }, "Session type created successfully.");
  } catch (error) {
    next(error);
  }
};

const listSessionTypes = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionTypes = await sessionTypeService.listSessionTypes();
    sendSuccessResponse(res, StatusCodes.OK, { sessionTypes }, "Session types fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const getSessionType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionTypeId } = req.params as { sessionTypeId: string };
    const sessionType = await sessionTypeService.getSessionType(sessionTypeId);
    sendSuccessResponse(res, StatusCodes.OK, { sessionType }, "Session type fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const updateSessionType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const { sessionTypeId } = req.params as { sessionTypeId: string };
    const sessionType = await sessionTypeService.updateSessionType(sessionTypeId, req.body, caller);
    sendSuccessResponse(res, StatusCodes.OK, { sessionType }, "Session type updated successfully.");
  } catch (error) {
    next(error);
  }
};

const deleteSessionType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const { sessionTypeId } = req.params as { sessionTypeId: string };
    await sessionTypeService.deleteSessionType(sessionTypeId, caller);
    res.status(StatusCodes.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
};

export { createSessionType, listSessionTypes, getSessionType, updateSessionType, deleteSessionType };
