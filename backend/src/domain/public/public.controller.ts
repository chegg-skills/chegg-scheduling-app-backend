import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import * as AvailabilityService from "../availability/availability.service";
import * as PublicService from "./public.service";
import { ErrorHandler } from "../../shared/error/errorhandler";

export const listTeams = async (_req: Request, res: Response) => {
    const teams = await PublicService.listTeams();
    return sendSuccessResponse(res, StatusCodes.OK, { teams }, "Teams fetched successfully.");
};

export const listTeamEvents = async (req: Request, res: Response) => {
    const teamId = req.params.teamId as string;
    const events = await PublicService.listTeamEvents(teamId);
    return sendSuccessResponse(res, StatusCodes.OK, { events }, "Events fetched successfully.");
};

export const getAvailableSlots = async (req: Request, res: Response) => {
    const eventId = req.params.eventId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    if (!startDate || !endDate) {
        throw new ErrorHandler(StatusCodes.BAD_REQUEST, "startDate and endDate are required.");
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Invalid date format.");
    }

    // Limit range to 32 days
    if (end.getTime() - start.getTime() > 32 * 24 * 60 * 60 * 1000) {
        throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Date range cannot exceed 32 days.");
    }

    const slots = await AvailabilityService.getAvailableSlots(eventId, start, end);

    return sendSuccessResponse(res, StatusCodes.OK, { slots }, "Available slots fetched successfully.");
};
