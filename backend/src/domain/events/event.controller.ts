import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/http/responseHelper";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as eventService from "./event.service";
import * as sessionLogService from "./sessionLog.service";
import * as availabilityDebugService from "../availability/availabilityDebug.service";

const createEvent = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const event = await eventService.createEvent(req.params.teamId as string, req.body, caller);

  sendSuccessResponse(res, StatusCodes.CREATED, event, "Event created successfully.");
};

const duplicateEvent = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const event = await eventService.duplicateEvent(req.params.eventId as string, caller);

  sendSuccessResponse(res, StatusCodes.CREATED, event, "Event duplicated successfully.");
};

const createEventType = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const eventType = await eventService.createEventType(req.body, caller);

  sendSuccessResponse(res, StatusCodes.CREATED, eventType, "Event type created successfully.");
};

const listEventTypes = async (_req: Request, res: Response) => {
  const result = await eventService.listEventTypes();

  sendSuccessResponse(res, StatusCodes.OK, result, "Event types fetched successfully.");
};

const updateEventType = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const eventType = await eventService.updateEventType(
    req.params.eventTypeId as string,
    req.body,
    caller,
  );

  sendSuccessResponse(res, StatusCodes.OK, eventType, "Event type updated successfully.");
};

const deleteEventType = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const eventType = await eventService.deleteEventType(req.params.eventTypeId as string, caller);

  sendSuccessResponse(res, StatusCodes.OK, eventType, "Event type deleted successfully.");
};

const getEventTypeUsage = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const usage = await eventService.getEventTypeUsage(req.params.eventTypeId as string, caller);

  sendSuccessResponse(res, StatusCodes.OK, usage, "Event type usage fetched successfully.");
};

const listInteractionTypes = async (_req: Request, res: Response) => {
  const result = eventService.listInteractionTypes();

  sendSuccessResponse(res, StatusCodes.OK, result, "Interaction types fetched successfully.");
};

const listTeamEvents = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await eventService.listTeamEvents(req.params.teamId as string, caller, {
    page: req.query.page ? Number(req.query.page) : undefined,
    pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
  });

  sendSuccessResponse(res, StatusCodes.OK, result, "Events fetched successfully.");
};

const readEvent = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const event = await eventService.readEvent(req.params.eventId as string, caller);

  sendSuccessResponse(res, StatusCodes.OK, event, "Event fetched successfully.");
};

const updateEvent = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const event = await eventService.updateEvent(req.params.eventId as string, req.body, caller);

  sendSuccessResponse(res, StatusCodes.OK, event, "Event updated successfully.");
};

const deleteEvent = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const event = await eventService.deleteEvent(req.params.eventId as string, caller);

  sendSuccessResponse(res, StatusCodes.OK, event, "Event deleted successfully.");
};

const listEventCoaches = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await eventService.listEventCoaches(req.params.eventId as string, caller);

  sendSuccessResponse(res, StatusCodes.OK, result, "Event coaches fetched successfully.");
};

const replaceEventCoaches = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await eventService.replaceEventCoaches(
    req.params.eventId as string,
    req.body,
    caller,
  );

  sendSuccessResponse(res, StatusCodes.OK, result, "Event coaches updated successfully.");
};

const removeEventCoach = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await eventService.removeEventCoach(
    req.params.eventId as string,
    req.params.userId as string,
    caller,
  );

  sendSuccessResponse(res, StatusCodes.OK, result, "Event coach removed successfully.");
};

const getEventCoachAvailability = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await eventService.getEventCoachAvailability(
    req.params.eventId as string,
    req.params.coachUserId as string,
    caller,
  );
  sendSuccessResponse(
    res,
    StatusCodes.OK,
    result,
    "Event coach availability fetched successfully.",
  );
};

const setEventCoachAvailability = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await eventService.setEventCoachAvailability(
    req.params.eventId as string,
    req.params.coachUserId as string,
    req.body,
    caller,
  );
  sendSuccessResponse(
    res,
    StatusCodes.OK,
    result,
    "Event coach availability updated successfully.",
  );
};

const listEventScheduleSlots = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await eventService.listEventScheduleSlots(req.params.eventId as string, caller);

  sendSuccessResponse(res, StatusCodes.OK, result, "Event schedule slots fetched successfully.");
};

const createEventScheduleSlot = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const slot = await eventService.createEventScheduleSlot(
    req.params.eventId as string,
    req.body,
    caller,
  );

  sendSuccessResponse(res, StatusCodes.CREATED, slot, "Event schedule slot created successfully.");
};

const updateEventScheduleSlot = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const slot = await eventService.updateEventScheduleSlot(
    req.params.eventId as string,
    req.params.slotId as string,
    req.body,
    caller,
  );

  sendSuccessResponse(res, StatusCodes.OK, slot, "Event schedule slot updated successfully.");
};

const deleteEventScheduleSlot = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const slot = await eventService.deleteEventScheduleSlot(
    req.params.eventId as string,
    req.params.slotId as string,
    caller,
  );

  sendSuccessResponse(res, StatusCodes.OK, slot, "Event schedule slot deleted successfully.");
};

const cancelEventScheduleSlot = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const slot = await eventService.cancelEventScheduleSlot(
    req.params.eventId as string,
    req.params.slotId as string,
    caller,
  );

  sendSuccessResponse(res, StatusCodes.OK, slot, "Event schedule slot cancelled successfully.");
};

const getCoachAvailabilityForSlot = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await eventService.getCoachAvailabilityForSlot(
    req.params.eventId as string,
    req.params.slotId as string,
    caller,
  );
  sendSuccessResponse(res, StatusCodes.OK, result, "Coach availability fetched.");
};

const getCoachAvailabilityForProposedSlot = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const { startTime, endTime, excludeSlotId } = req.query as Record<string, string>;
  if (!startTime || !endTime || isNaN(Date.parse(startTime)) || isNaN(Date.parse(endTime))) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "startTime and endTime must be valid ISO date strings." });
    return;
  }
  const result = await eventService.getCoachAvailabilityForProposedSlot(
    req.params.eventId as string,
    new Date(startTime),
    new Date(endTime),
    excludeSlotId || undefined,
    caller,
  );
  sendSuccessResponse(res, StatusCodes.OK, result, "Coach availability fetched.");
};

const revealCoachForSlot = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const slot = await eventService.revealCoachForSlot(
    req.params.eventId as string,
    req.params.slotId as string,
    req.body,
    caller,
  );
  sendSuccessResponse(res, StatusCodes.OK, slot, "Coach reveal sent successfully.");
};

const listAllEvents = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await eventService.listAllEvents(caller, {
    page: req.query.page ? Number(req.query.page) : undefined,
    pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
  });

  sendSuccessResponse(res, StatusCodes.OK, result, "Events fetched successfully.");
};

const listSlotBookings = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await eventService.listSlotBookings(
    req.params.eventId as string,
    req.params.slotId as string,
    caller,
  );

  sendSuccessResponse(res, StatusCodes.OK, result, "Slot bookings fetched successfully.");
};

const getSlotDebugReport = async (req: Request, res: Response) => {
  const { date, timezone } = req.query as Record<string, string>;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "A valid 'date' query param (YYYY-MM-DD) is required." });
    return;
  }
  const report = await availabilityDebugService.getSlotDebugReport(
    req.params.eventId as string,
    date,
    { timezone: timezone || undefined },
  );
  sendSuccessResponse(res, StatusCodes.OK, report, "Slot availability debug report generated.");
};

const getSessionLog = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await sessionLogService.getSessionLog(
    req.params.eventId as string,
    req.params.slotId as string,
    caller,
  );
  sendSuccessResponse(res, StatusCodes.OK, result, "Session log fetched successfully.");
};

const upsertSessionLog = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await sessionLogService.upsertSessionLog(
    req.params.eventId as string,
    req.params.slotId as string,
    req.body,
    caller,
  );
  sendSuccessResponse(res, StatusCodes.OK, result, "Session log saved successfully.");
};

const stopRecurrenceGroup = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await eventService.stopRecurrenceGroup(
    req.params.eventId as string,
    req.params.groupId as string,
    caller,
  );
  sendSuccessResponse(res, StatusCodes.OK, result, "Recurrence series stopped successfully.");
};

const resumeRecurrenceGroup = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await eventService.resumeRecurrenceGroup(
    req.params.eventId as string,
    req.params.groupId as string,
    caller,
  );
  sendSuccessResponse(res, StatusCodes.OK, result, "Recurrence series resumed successfully.");
};

export default {
  createEvent: asyncHandler(createEvent),
  duplicateEvent: asyncHandler(duplicateEvent),
  createEventType: asyncHandler(createEventType),
  listEventTypes: asyncHandler(listEventTypes),
  updateEventType: asyncHandler(updateEventType),
  deleteEventType: asyncHandler(deleteEventType),
  getEventTypeUsage: asyncHandler(getEventTypeUsage),
  listInteractionTypes: asyncHandler(listInteractionTypes),
  listTeamEvents: asyncHandler(listTeamEvents),
  readEvent: asyncHandler(readEvent),
  updateEvent: asyncHandler(updateEvent),
  deleteEvent: asyncHandler(deleteEvent),
  listEventCoaches: asyncHandler(listEventCoaches),
  replaceEventCoaches: asyncHandler(replaceEventCoaches),
  removeEventCoach: asyncHandler(removeEventCoach),
  getEventCoachAvailability: asyncHandler(getEventCoachAvailability),
  setEventCoachAvailability: asyncHandler(setEventCoachAvailability),
  listEventScheduleSlots: asyncHandler(listEventScheduleSlots),
  createEventScheduleSlot: asyncHandler(createEventScheduleSlot),
  updateEventScheduleSlot: asyncHandler(updateEventScheduleSlot),
  deleteEventScheduleSlot: asyncHandler(deleteEventScheduleSlot),
  cancelEventScheduleSlot: asyncHandler(cancelEventScheduleSlot),
  getCoachAvailabilityForSlot: asyncHandler(getCoachAvailabilityForSlot),
  getCoachAvailabilityForProposedSlot: asyncHandler(getCoachAvailabilityForProposedSlot),
  revealCoachForSlot: asyncHandler(revealCoachForSlot),
  listAllEvents: asyncHandler(listAllEvents),
  listSlotBookings: asyncHandler(listSlotBookings),
  getSlotDebugReport: asyncHandler(getSlotDebugReport),
  getSessionLog: asyncHandler(getSessionLog),
  upsertSessionLog: asyncHandler(upsertSessionLog),
  stopRecurrenceGroup: asyncHandler(stopRecurrenceGroup),
  resumeRecurrenceGroup: asyncHandler(resumeRecurrenceGroup),
};
