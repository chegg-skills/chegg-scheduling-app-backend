import { Request, Response } from "express";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/http/responseHelper";
import { parseBoundedDateRange } from "../../shared/utils/date";
import * as AvailabilityService from "../availability/availability.service";
import * as PublicService from "./public.service";
import { resolveFrontendUrl } from "../../shared/notifications/notification.publisher";

const listTeams = async (_req: Request, res: Response) => {
  const teams = await PublicService.listTeams();
  return sendSuccessResponse(res, StatusCodes.OK, { teams }, "Teams fetched successfully.");
};

const getTeamBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const team = await PublicService.getTeamBySlug(slug as string);
  return sendSuccessResponse(res, StatusCodes.OK, { team }, "Team fetched successfully.");
};

const listTeamEvents = async (req: Request, res: Response) => {
  const { teamId } = req.params;
  const events = await PublicService.listTeamEvents(teamId as string);
  return sendSuccessResponse(res, StatusCodes.OK, { events }, "Events fetched successfully.");
};

const listTeamEventsBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const result = await PublicService.listTeamEventsBySlug(slug as string);
  return sendSuccessResponse(res, StatusCodes.OK, result, "Team events fetched successfully.");
};

const getEventBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const event = await PublicService.getEventBySlug(slug as string);
  return sendSuccessResponse(res, StatusCodes.OK, { event }, "Event fetched successfully.");
};

const getCoachBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const coach = await PublicService.getCoachBySlug(slug as string);
  return sendSuccessResponse(res, StatusCodes.OK, { coach }, "Coach fetched successfully.");
};

const listCoachEventsBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const result = await PublicService.listCoachEventsBySlug(slug as string);
  return sendSuccessResponse(res, StatusCodes.OK, result, "Coach events fetched successfully.");
};

const getAvailableSlots = async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  const preferredCoachId = req.query.preferredCoachId as string | undefined;
  const timezone = req.query.timezone as string | undefined;

  const { start, end } = parseBoundedDateRange({
    startDate,
    endDate,
    maxRangeDays: 32,
  });

  const slots = await AvailabilityService.getAvailableSlots(
    eventId as string,
    start,
    end,
    preferredCoachId,
    timezone,
  );

  return sendSuccessResponse(
    res,
    StatusCodes.OK,
    { slots },
    "Available slots fetched successfully.",
  );
};

const getGroupBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const group = await PublicService.getGroupBySlug(slug as string);
  return sendSuccessResponse(res, StatusCodes.OK, { group }, "Group fetched successfully.");
};

const listGroupEventsBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const result = await PublicService.listGroupEventsBySlug(slug as string);
  return sendSuccessResponse(res, StatusCodes.OK, result, "Group events fetched successfully.");
};

const getPublicBookingDirectory = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const directory = await PublicService.getPublicBookingDirectory(slug as string);
  return sendSuccessResponse(
    res,
    StatusCodes.OK,
    { bookingDirectory: directory },
    "Booking directory fetched successfully.",
  );
};

const joinSession = async (req: Request, res: Response) => {
  const { slotId } = req.params;
  const token = (req.query.t as string | undefined) ?? "";
  const result = await PublicService.resolveSlotJoinRedirect(slotId as string, token);

  // The same URL must resolve to a different coach over time — never let a
  // browser or intermediary proxy cache this redirect.
  res.set("Cache-Control", "no-store");

  if (result.type === "redirect") {
    return res.redirect(StatusCodes.MOVED_TEMPORARILY, result.url);
  }

  return res.redirect(
    StatusCodes.MOVED_TEMPORARILY,
    `${resolveFrontendUrl()}/session/${slotId}/status?state=${result.state}`,
  );
};

const getPublicBooking = async (req: Request, res: Response) => {
  const { id } = req.params;
  const authHeader = req.headers.authorization;
  const token =
    (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null) ??
    (req.query.token as string | undefined) ??
    "";
  const mode = req.query.mode as string | undefined;

  const booking = await PublicService.getPublicBooking(id as string, token, mode);

  return sendSuccessResponse(res, StatusCodes.OK, { booking }, "Booking fetched successfully.");
};

export default {
  listTeams: asyncHandler(listTeams),
  getTeamBySlug: asyncHandler(getTeamBySlug),
  listTeamEvents: asyncHandler(listTeamEvents),
  listTeamEventsBySlug: asyncHandler(listTeamEventsBySlug),
  getEventBySlug: asyncHandler(getEventBySlug),
  getCoachBySlug: asyncHandler(getCoachBySlug),
  listCoachEventsBySlug: asyncHandler(listCoachEventsBySlug),
  getAvailableSlots: asyncHandler(getAvailableSlots),
  getGroupBySlug: asyncHandler(getGroupBySlug),
  listGroupEventsBySlug: asyncHandler(listGroupEventsBySlug),
  getPublicBookingDirectory: asyncHandler(getPublicBookingDirectory),
  getPublicBooking: asyncHandler(getPublicBooking),
  joinSession: asyncHandler(joinSession),
};
