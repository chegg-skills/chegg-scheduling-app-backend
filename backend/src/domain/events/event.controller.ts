import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as eventService from "./event.service";

const getTeamIdParam = (req: Request): string => {
  const { teamId } = req.params;
  return Array.isArray(teamId) ? teamId[0] : teamId;
};

const getEventIdParam = (req: Request): string => {
  const { eventId } = req.params;
  return Array.isArray(eventId) ? eventId[0] : eventId;
};

const getOfferingIdParam = (req: Request): string => {
  const { offeringId } = req.params;
  return Array.isArray(offeringId) ? offeringId[0] : offeringId;
};

const getInteractionTypeIdParam = (req: Request): string => {
  const { interactionTypeId } = req.params;
  return Array.isArray(interactionTypeId) ? interactionTypeId[0] : interactionTypeId;
};

const getUserIdParam = (req: Request): string => {
  const { userId } = req.params;
  return Array.isArray(userId) ? userId[0] : userId;
};

const getSlotIdParam = (req: Request): string => {
  const { slotId } = req.params;
  return Array.isArray(slotId) ? slotId[0] : slotId;
};

const parsePositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
};

const createEvent = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const event = await eventService.createEvent(
      getTeamIdParam(req),
      req.body,
      caller,
    );

    sendSuccessResponse(
      res,
      StatusCodes.CREATED,
      event,
      "Event created successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const createEventOffering = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const offering = await eventService.createEventOffering(req.body, caller);

    sendSuccessResponse(
      res,
      StatusCodes.CREATED,
      offering,
      "Event offering created successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const listEventOfferings = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await eventService.listEventOfferings();

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      result,
      "Event offerings fetched successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const updateEventOffering = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const offering = await eventService.updateEventOffering(
      getOfferingIdParam(req),
      req.body,
      caller,
    );

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      offering,
      "Event offering updated successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const createInteractionType = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const interactionType = await eventService.createInteractionType(req.body, caller);

    sendSuccessResponse(
      res,
      StatusCodes.CREATED,
      interactionType,
      "Interaction type created successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const listInteractionTypes = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await eventService.listInteractionTypes();

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      result,
      "Interaction types fetched successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const updateInteractionType = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const interactionType = await eventService.updateInteractionType(
      getInteractionTypeIdParam(req),
      req.body,
      caller,
    );

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      interactionType,
      "Interaction type updated successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const deleteInteractionType = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const interactionType = await eventService.deleteInteractionType(
      getInteractionTypeIdParam(req),
      caller,
    );

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      interactionType,
      "Interaction type deleted successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const getInteractionTypeUsage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const usage = await eventService.getInteractionTypeUsage(
      getInteractionTypeIdParam(req),
      caller,
    );

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      usage,
      "Interaction type usage fetched successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const listTeamEvents = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const page = parsePositiveInt(req.query.page);
    const pageSize = parsePositiveInt(req.query.pageSize);
    const result = await eventService.listTeamEvents(
      getTeamIdParam(req),
      caller,
      { page, pageSize },
    );

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      result,
      "Events fetched successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const readEvent = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const event = await eventService.readEvent(getEventIdParam(req), caller);

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      event,
      "Event fetched successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const updateEvent = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const event = await eventService.updateEvent(
      getEventIdParam(req),
      req.body,
      caller,
    );

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      event,
      "Event updated successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const deleteEvent = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const event = await eventService.deleteEvent(getEventIdParam(req), caller);

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      event,
      "Event deleted successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const listEventHosts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const result = await eventService.listEventHosts(
      getEventIdParam(req),
      caller,
    );

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      result,
      "Event hosts fetched successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const replaceEventHosts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const result = await eventService.replaceEventHosts(
      getEventIdParam(req),
      req.body,
      caller,
    );

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      result,
      "Event hosts updated successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const removeEventHost = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const result = await eventService.removeEventHost(
      getEventIdParam(req),
      getUserIdParam(req),
      caller,
    );

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      result,
      "Event host removed successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const listEventScheduleSlots = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const result = await eventService.listEventScheduleSlots(
      getEventIdParam(req),
      caller,
    );

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      result,
      "Event schedule slots fetched successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const createEventScheduleSlot = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const slot = await eventService.createEventScheduleSlot(
      getEventIdParam(req),
      req.body,
      caller,
    );

    sendSuccessResponse(
      res,
      StatusCodes.CREATED,
      slot,
      "Event schedule slot created successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const updateEventScheduleSlot = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const slot = await eventService.updateEventScheduleSlot(
      getEventIdParam(req),
      getSlotIdParam(req),
      req.body,
      caller,
    );

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      slot,
      "Event schedule slot updated successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const deleteEventScheduleSlot = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const slot = await eventService.deleteEventScheduleSlot(
      getEventIdParam(req),
      getSlotIdParam(req),
      caller,
    );

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      slot,
      "Event schedule slot deleted successfully.",
    );
  } catch (error) {
    next(error);
  }
};

export {
  createEventOffering,
  listEventOfferings,
  updateEventOffering,
  createInteractionType,
  listInteractionTypes,
  updateInteractionType,
  createEvent,
  createEventScheduleSlot,
  deleteEvent,
  deleteEventScheduleSlot,
  listEventHosts,
  listEventScheduleSlots,
  listTeamEvents,
  readEvent,
  removeEventHost,
  replaceEventHosts,
  updateEvent,
  updateEventScheduleSlot, deleteInteractionType, getInteractionTypeUsage,
};