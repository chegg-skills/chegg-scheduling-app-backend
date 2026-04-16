import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import { parseBoundedDateRange } from "../../shared/utils/date";
import * as AvailabilityService from "../availability/availability.service";
import * as PublicService from "./public.service";
import { ErrorHandler } from "../../shared/error/errorhandler";

export const listTeams = async (_req: Request, res: Response) => {
  const teams = await PublicService.listTeams();
  return sendSuccessResponse(res, StatusCodes.OK, { teams }, "Teams fetched successfully.");
};

export const getTeamBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const team = await PublicService.getTeamBySlug(slug as string);
  return sendSuccessResponse(res, StatusCodes.OK, { team }, "Team fetched successfully.");
};

export const listTeamEvents = async (req: Request, res: Response) => {
  const { teamId } = req.params;
  const events = await PublicService.listTeamEvents(teamId as string);
  return sendSuccessResponse(res, StatusCodes.OK, { events }, "Events fetched successfully.");
};

export const listTeamEventsBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const result = await PublicService.listTeamEventsBySlug(slug as string);
  return sendSuccessResponse(res, StatusCodes.OK, result, "Team events fetched successfully.");
};

export const getEventBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const event = await PublicService.getEventBySlug(slug as string);
  return sendSuccessResponse(res, StatusCodes.OK, { event }, "Event fetched successfully.");
};

export const getCoachBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const coach = await PublicService.getCoachBySlug(slug as string);
  return sendSuccessResponse(res, StatusCodes.OK, { coach }, "Coach fetched successfully.");
};

export const listCoachEventsBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const result = await PublicService.listCoachEventsBySlug(slug as string);
  return sendSuccessResponse(res, StatusCodes.OK, result, "Coach events fetched successfully.");
};

export const getAvailableSlots = async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  const preferredHostId = req.query.preferredHostId as string | undefined;

  const { start, end } = parseBoundedDateRange({
    startDate,
    endDate,
    maxRangeDays: 32,
  });

  const slots = await AvailabilityService.getAvailableSlots(
    eventId as string,
    start,
    end,
    preferredHostId,
  );

  return sendSuccessResponse(
    res,
    StatusCodes.OK,
    { slots },
    "Available slots fetched successfully.",
  );
};

export const getPublicBooking = async (req: Request, res: Response) => {
  const { id } = req.params;
  const token = req.query.token as string;

  const booking = await PublicService.getPublicBooking(id as string, token);

  return sendSuccessResponse(res, StatusCodes.OK, { booking }, "Booking fetched successfully.");
};
