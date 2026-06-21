import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/http/responseHelper";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as eventService from "./event.service";
import * as sessionLogService from "./sessionLog.service";
import * as availabilityDebugService from "../availability/availabilityDebug.service";

const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const event = await eventService.createEvent(req.params.teamId as string, req.body, caller);

  sendSuccessResponse(res, StatusCodes.CREATED, event, "Event created successfully.");
});

const duplicateEvent = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const event = await eventService.duplicateEvent(req.params.eventId as string, caller);

  sendSuccessResponse(res, StatusCodes.CREATED, event, "Event duplicated successfully.");
});

const createEventType = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const eventType = await eventService.createEventType(req.body, caller);

  sendSuccessResponse(res, StatusCodes.CREATED, eventType, "Event type created successfully.");
});

const listEventTypes = asyncHandler(async (_req: Request, res: Response) => {
  const result = await eventService.listEventTypes();

  sendSuccessResponse(res, StatusCodes.OK, result, "Event types fetched successfully.");
});

const updateEventType = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const eventType = await eventService.updateEventType(
    req.params.eventTypeId as string,
    req.body,
    caller,
  );

  sendSuccessResponse(res, StatusCodes.OK, eventType, "Event type updated successfully.");
});

const deleteEventType = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const eventType = await eventService.deleteEventType(req.params.eventTypeId as string, caller);

  sendSuccessResponse(res, StatusCodes.OK, eventType, "Event type deleted successfully.");
});

const getEventTypeUsage = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const usage = await eventService.getEventTypeUsage(req.params.eventTypeId as string, caller);

  sendSuccessResponse(res, StatusCodes.OK, usage, "Event type usage fetched successfully.");
});

const listInteractionTypes = asyncHandler(async (_req: Request, res: Response) => {
  const result = eventService.listInteractionTypes();

  sendSuccessResponse(res, StatusCodes.OK, result, "Interaction types fetched successfully.");
});

const listTeamEvents = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await eventService.listTeamEvents(req.params.teamId as string, caller, {
    page: req.query.page ? Number(req.query.page) : undefined,
    pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
  });

  sendSuccessResponse(res, StatusCodes.OK, result, "Events fetched successfully.");
});

const readEvent = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const event = await eventService.readEvent(req.params.eventId as string, caller);

  sendSuccessResponse(res, StatusCodes.OK, event, "Event fetched successfully.");
});

const updateEvent = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const event = await eventService.updateEvent(req.params.eventId as string, req.body, caller);

  sendSuccessResponse(res, StatusCodes.OK, event, "Event updated successfully.");
});

const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const event = await eventService.deleteEvent(req.params.eventId as string, caller);

  sendSuccessResponse(res, StatusCodes.OK, event, "Event deleted successfully.");
});

const listEventCoaches = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await eventService.listEventCoaches(req.params.eventId as string, caller);

  sendSuccessResponse(res, StatusCodes.OK, result, "Event coaches fetched successfully.");
});

const replaceEventCoaches = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await eventService.replaceEventCoaches(
    req.params.eventId as string,
    req.body,
    caller,
  );

  sendSuccessResponse(res, StatusCodes.OK, result, "Event coaches updated successfully.");
});

const removeEventCoach = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await eventService.removeEventCoach(
    req.params.eventId as string,
    req.params.userId as string,
    caller,
  );

  sendSuccessResponse(res, StatusCodes.OK, result, "Event coach removed successfully.");
});

const getEventCoachAvailability = asyncHandler(async (req: Request, res: Response) => {
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
});

const setEventCoachAvailability = asyncHandler(async (req: Request, res: Response) => {
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
});

const listEventScheduleSlots = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await eventService.listEventScheduleSlots(req.params.eventId as string, caller);

  sendSuccessResponse(res, StatusCodes.OK, result, "Event schedule slots fetched successfully.");
});

const createEventScheduleSlot = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const slot = await eventService.createEventScheduleSlot(
    req.params.eventId as string,
    req.body,
    caller,
  );

  sendSuccessResponse(res, StatusCodes.CREATED, slot, "Event schedule slot created successfully.");
});

const updateEventScheduleSlot = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const slot = await eventService.updateEventScheduleSlot(
    req.params.eventId as string,
    req.params.slotId as string,
    req.body,
    caller,
  );

  sendSuccessResponse(res, StatusCodes.OK, slot, "Event schedule slot updated successfully.");
});

const deleteEventScheduleSlot = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const slot = await eventService.deleteEventScheduleSlot(
    req.params.eventId as string,
    req.params.slotId as string,
    caller,
  );

  sendSuccessResponse(res, StatusCodes.OK, slot, "Event schedule slot deleted successfully.");
});

const cancelEventScheduleSlot = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const slot = await eventService.cancelEventScheduleSlot(
    req.params.eventId as string,
    req.params.slotId as string,
    caller,
  );

  sendSuccessResponse(res, StatusCodes.OK, slot, "Event schedule slot cancelled successfully.");
});

const getCoachAvailabilityForSlot = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await eventService.getCoachAvailabilityForSlot(
    req.params.eventId as string,
    req.params.slotId as string,
    caller,
  );
  sendSuccessResponse(res, StatusCodes.OK, result, "Coach availability fetched.");
});

const getCoachAvailabilityForProposedSlot = asyncHandler(async (req: Request, res: Response) => {
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
});

const revealCoachForSlot = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const slot = await eventService.revealCoachForSlot(
    req.params.eventId as string,
    req.params.slotId as string,
    req.body,
    caller,
  );
  sendSuccessResponse(res, StatusCodes.OK, slot, "Coach reveal sent successfully.");
});

const listAllEvents = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await eventService.listAllEvents(caller, {
    page: req.query.page ? Number(req.query.page) : undefined,
    pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
  });

  sendSuccessResponse(res, StatusCodes.OK, result, "Events fetched successfully.");
});

const listSlotBookings = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await eventService.listSlotBookings(
    req.params.eventId as string,
    req.params.slotId as string,
    caller,
  );

  sendSuccessResponse(res, StatusCodes.OK, result, "Slot bookings fetched successfully.");
});

const getSlotDebugReport = asyncHandler(async (req: Request, res: Response) => {
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
});

export {
  getSlotDebugReport,
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
  getCoachAvailabilityForProposedSlot,
  stopRecurrenceGroup,
  resumeRecurrenceGroup,
  getSessionLog,
  upsertSessionLog,
  getEventCoachAvailability,
  setEventCoachAvailability,
};

const getSessionLog = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await sessionLogService.getSessionLog(
    req.params.eventId as string,
    req.params.slotId as string,
    caller,
  );
  sendSuccessResponse(res, StatusCodes.OK, result, "Session log fetched successfully.");
});

const upsertSessionLog = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await sessionLogService.upsertSessionLog(
    req.params.eventId as string,
    req.params.slotId as string,
    req.body,
    caller,
  );
  sendSuccessResponse(res, StatusCodes.OK, result, "Session log saved successfully.");
});

const stopRecurrenceGroup = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await eventService.stopRecurrenceGroup(
    req.params.eventId as string,
    req.params.groupId as string,
    caller,
  );
  sendSuccessResponse(res, StatusCodes.OK, result, "Recurrence series stopped successfully.");
});

const resumeRecurrenceGroup = asyncHandler(async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await eventService.resumeRecurrenceGroup(
    req.params.eventId as string,
    req.params.groupId as string,
    caller,
  );
  sendSuccessResponse(res, StatusCodes.OK, result, "Recurrence series resumed successfully.");
});
