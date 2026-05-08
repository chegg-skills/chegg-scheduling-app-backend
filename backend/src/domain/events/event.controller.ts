import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as eventService from "./event.service";
import * as sessionLogService from "./sessionLog.service";

const createEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const event = await eventService.createEvent(req.params.teamId as string, req.body, caller);

    sendSuccessResponse(res, StatusCodes.CREATED, event, "Event created successfully.");
  } catch (error) {
    next(error);
  }
};

const duplicateEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const event = await eventService.duplicateEvent(req.params.eventId as string, caller);

    sendSuccessResponse(res, StatusCodes.CREATED, event, "Event duplicated successfully.");
  } catch (error) {
    next(error);
  }
};

const createEventType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const eventType = await eventService.createEventType(req.body, caller);

    sendSuccessResponse(res, StatusCodes.CREATED, eventType, "Event type created successfully.");
  } catch (error) {
    next(error);
  }
};

const listEventTypes = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await eventService.listEventTypes();

    sendSuccessResponse(res, StatusCodes.OK, result, "Event types fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const updateEventType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const eventType = await eventService.updateEventType(
      req.params.eventTypeId as string,
      req.body,
      caller,
    );

    sendSuccessResponse(res, StatusCodes.OK, eventType, "Event type updated successfully.");
  } catch (error) {
    next(error);
  }
};

const deleteEventType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const eventType = await eventService.deleteEventType(req.params.eventTypeId as string, caller);

    sendSuccessResponse(res, StatusCodes.OK, eventType, "Event type deleted successfully.");
  } catch (error) {
    next(error);
  }
};

const getEventTypeUsage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const usage = await eventService.getEventTypeUsage(req.params.eventTypeId as string, caller);

    sendSuccessResponse(res, StatusCodes.OK, usage, "Event type usage fetched successfully.");
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
    const result = eventService.listInteractionTypes();

    sendSuccessResponse(res, StatusCodes.OK, result, "Interaction types fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const listTeamEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const result = await eventService.listTeamEvents(req.params.teamId as string, caller, {
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });

    sendSuccessResponse(res, StatusCodes.OK, result, "Events fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const readEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const event = await eventService.readEvent(req.params.eventId as string, caller);

    sendSuccessResponse(res, StatusCodes.OK, event, "Event fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const updateEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const event = await eventService.updateEvent(req.params.eventId as string, req.body, caller);

    sendSuccessResponse(res, StatusCodes.OK, event, "Event updated successfully.");
  } catch (error) {
    next(error);
  }
};

const deleteEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const event = await eventService.deleteEvent(req.params.eventId as string, caller);

    sendSuccessResponse(res, StatusCodes.OK, event, "Event deleted successfully.");
  } catch (error) {
    next(error);
  }
};

const listEventCoaches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const result = await eventService.listEventCoaches(req.params.eventId as string, caller);

    sendSuccessResponse(res, StatusCodes.OK, result, "Event coaches fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const replaceEventCoaches = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const result = await eventService.replaceEventCoaches(
      req.params.eventId as string,
      req.body,
      caller,
    );

    sendSuccessResponse(res, StatusCodes.OK, result, "Event coaches updated successfully.");
  } catch (error) {
    next(error);
  }
};

const removeEventCoach = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const result = await eventService.removeEventCoach(
      req.params.eventId as string,
      req.params.userId as string,
      caller,
    );

    sendSuccessResponse(res, StatusCodes.OK, result, "Event coach removed successfully.");
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
    const result = await eventService.listEventScheduleSlots(req.params.eventId as string, caller);

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
      req.params.eventId as string,
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
      req.params.eventId as string,
      req.params.slotId as string,
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
      req.params.eventId as string,
      req.params.slotId as string,
      caller,
    );

    sendSuccessResponse(res, StatusCodes.OK, slot, "Event schedule slot deleted successfully.");
  } catch (error) {
    next(error);
  }
};

const cancelEventScheduleSlot = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const slot = await eventService.cancelEventScheduleSlot(
      req.params.eventId as string,
      req.params.slotId as string,
      caller,
    );

    sendSuccessResponse(res, StatusCodes.OK, slot, "Event schedule slot cancelled successfully.");
  } catch (error) {
    next(error);
  }
};

const getCoachAvailabilityForSlot = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const result = await eventService.getCoachAvailabilityForSlot(
      req.params.eventId as string,
      req.params.slotId as string,
      caller,
    );
    sendSuccessResponse(res, StatusCodes.OK, result, "Coach availability fetched.");
  } catch (error) {
    next(error);
  }
};

const revealCoachForSlot = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const slot = await eventService.revealCoachForSlot(
      req.params.eventId as string,
      req.params.slotId as string,
      req.body,
      caller,
    );
    sendSuccessResponse(res, StatusCodes.OK, slot, "Coach reveal sent successfully.");
  } catch (error) {
    next(error);
  }
};

const listAllEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const result = await eventService.listAllEvents(caller, {
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });

    sendSuccessResponse(res, StatusCodes.OK, result, "Events fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const listSlotBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const result = await eventService.listSlotBookings(
      req.params.eventId as string,
      req.params.slotId as string,
      caller,
    );

    sendSuccessResponse(res, StatusCodes.OK, result, "Slot bookings fetched successfully.");
  } catch (error) {
    next(error);
  }
};

export {
  createEventType,
  listEventTypes,
  updateEventType,
  deleteEventType,
  getEventTypeUsage,
  listInteractionTypes,
  createEvent,
  duplicateEvent,
  createEventScheduleSlot,
  deleteEvent,
  deleteEventScheduleSlot,
  cancelEventScheduleSlot,
  listEventCoaches,
  listEventScheduleSlots,
  listTeamEvents,
  listAllEvents,
  readEvent,
  removeEventCoach,
  replaceEventCoaches,
  updateEvent,
  updateEventScheduleSlot,
  listSlotBookings,
  revealCoachForSlot,
  getCoachAvailabilityForSlot,
  getSessionLog,
  upsertSessionLog,
};

async function getSessionLog(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const caller = res.locals.authUser as CallerContext;
    const result = await sessionLogService.getSessionLog(
      req.params.eventId as string,
      req.params.slotId as string,
      caller,
    );
    sendSuccessResponse(res, StatusCodes.OK, result, "Session log fetched successfully.");
  } catch (error) {
    next(error);
  }
}

async function upsertSessionLog(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const caller = res.locals.authUser as CallerContext;
    const result = await sessionLogService.upsertSessionLog(
      req.params.eventId as string,
      req.params.slotId as string,
      req.body,
      caller,
    );
    sendSuccessResponse(res, StatusCodes.OK, result, "Session log saved successfully.");
  } catch (error) {
    next(error);
  }
}
