import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as eventService from "./event.service";

const createEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const event = await eventService.createEvent((req.params as any).teamId, req.body, caller);

    sendSuccessResponse(res, StatusCodes.CREATED, event, "Event created successfully.");
  } catch (error) {
    next(error);
  }
};

const duplicateEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const event = await eventService.duplicateEvent((req.params as any).eventId, caller);

    sendSuccessResponse(res, StatusCodes.CREATED, event, "Event duplicated successfully.");
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

    sendSuccessResponse(res, StatusCodes.CREATED, offering, "Event offering created successfully.");
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

    sendSuccessResponse(res, StatusCodes.OK, result, "Event offerings fetched successfully.");
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
      (req.params as any).offeringId,
      req.body,
      caller,
    );

    sendSuccessResponse(res, StatusCodes.OK, offering, "Event offering updated successfully.");
  } catch (error) {
    next(error);
  }
};

const deleteEventOffering = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const offering = await eventService.deleteEventOffering((req.params as any).offeringId, caller);

    sendSuccessResponse(res, StatusCodes.OK, offering, "Event offering deleted successfully.");
  } catch (error) {
    next(error);
  }
};

const getEventOfferingUsage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const usage = await eventService.getEventOfferingUsage((req.params as any).offeringId, caller);

    sendSuccessResponse(res, StatusCodes.OK, usage, "Event offering usage fetched successfully.");
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

    sendSuccessResponse(res, StatusCodes.OK, result, "Interaction types fetched successfully.");
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
      (req.params as any).interactionTypeId,
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
      (req.params as any).interactionTypeId,
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
      (req.params as any).interactionTypeId,
      caller,
    );

    sendSuccessResponse(res, StatusCodes.OK, usage, "Interaction type usage fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const listTeamEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const filters = req.query as any;
    const result = await eventService.listTeamEvents((req.params as any).teamId, caller, {
      page: (req.query as any).page,
      pageSize: (req.query as any).pageSize,
    });

    sendSuccessResponse(res, StatusCodes.OK, result, "Events fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const readEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const event = await eventService.readEvent((req.params as any).eventId, caller);

    sendSuccessResponse(res, StatusCodes.OK, event, "Event fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const updateEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const event = await eventService.updateEvent((req.params as any).eventId, req.body, caller);

    sendSuccessResponse(res, StatusCodes.OK, event, "Event updated successfully.");
  } catch (error) {
    next(error);
  }
};

const deleteEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const event = await eventService.deleteEvent((req.params as any).eventId, caller);

    sendSuccessResponse(res, StatusCodes.OK, event, "Event deleted successfully.");
  } catch (error) {
    next(error);
  }
};

const listEventHosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const result = await eventService.listEventHosts((req.params as any).eventId, caller);

    sendSuccessResponse(res, StatusCodes.OK, result, "Event hosts fetched successfully.");
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
      (req.params as any).eventId,
      req.body,
      caller,
    );

    sendSuccessResponse(res, StatusCodes.OK, result, "Event hosts updated successfully.");
  } catch (error) {
    next(error);
  }
};

const removeEventHost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const result = await eventService.removeEventHost(
      (req.params as any).eventId,
      (req.params as any).userId,
      caller,
    );

    sendSuccessResponse(res, StatusCodes.OK, result, "Event host removed successfully.");
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
    const result = await eventService.listEventScheduleSlots((req.params as any).eventId, caller);

    sendSuccessResponse(res, StatusCodes.OK, result, "Event schedule slots fetched successfully.");
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
      (req.params as any).eventId,
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
      (req.params as any).eventId,
      (req.params as any).slotId,
      req.body,
      caller,
    );

    sendSuccessResponse(res, StatusCodes.OK, slot, "Event schedule slot updated successfully.");
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
      (req.params as any).eventId,
      (req.params as any).slotId,
      caller,
    );

    sendSuccessResponse(res, StatusCodes.OK, slot, "Event schedule slot deleted successfully.");
  } catch (error) {
    next(error);
  }
};

const listAllEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const filters = req.query as any;
    const result = await eventService.listAllEvents(caller, {
      page: filters.page,
      pageSize: filters.pageSize,
    });

    sendSuccessResponse(res, StatusCodes.OK, result, "Events fetched successfully.");
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
  duplicateEvent,
  createEventScheduleSlot,
  deleteEvent,
  deleteEventScheduleSlot,
  listEventHosts,
  listEventScheduleSlots,
  listTeamEvents,
  listAllEvents,
  readEvent,
  removeEventHost,
  replaceEventHosts,
  updateEvent,
  updateEventScheduleSlot,
  deleteInteractionType,
  getInteractionTypeUsage,
  deleteEventOffering,
  getEventOfferingUsage,
};
