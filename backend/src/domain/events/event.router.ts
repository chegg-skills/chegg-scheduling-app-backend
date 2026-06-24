import express from "express";
import { UserRole } from "@prisma/client";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import { authenticate, authorize } from "../../shared/middleware/auth";
import eventController from "./event.controller";
import { validate } from "../../shared/middleware/validate";
import {
  CreateEventSchema,
  ListTeamEventsSchema,
  ListAllEventsSchema,
  UpdateEventSchema,
  UpsertSessionLogSchema,
  RevealCoachSchema,
  GetEventCoachAvailabilitySchema,
  SetEventCoachAvailabilitySchema,
} from "./event.schema";

const router = express.Router();

router
  .route("/event-types")
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.createEventType,
  )
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    eventController.listEventTypes,
  )
  .all(methodNotAllowed);

router
  .route("/event-types/:eventTypeId")
  .patch(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.updateEventType,
  )
  .delete(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.deleteEventType,
  )
  .all(methodNotAllowed);

router
  .route("/event-types/:eventTypeId/usage")
  .get(authenticate, authorize(UserRole.SUPER_ADMIN), eventController.getEventTypeUsage)
  .all(methodNotAllowed);

router
  .route("/event-interaction-types")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    eventController.listInteractionTypes,
  )
  .all(methodNotAllowed);

router
  .route("/teams/:teamId/events")
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    validate(CreateEventSchema),
    eventController.createEvent,
  )
  .get(authenticate, validate(ListTeamEventsSchema), eventController.listTeamEvents)
  .all(methodNotAllowed);

router
  .route("/events")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    validate(ListAllEventsSchema),
    eventController.listAllEvents,
  )
  .all(methodNotAllowed);

router
  .route("/events/:eventId")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    eventController.readEvent,
  )
  .patch(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    validate(UpdateEventSchema),
    eventController.updateEvent,
  )
  .delete(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.deleteEvent,
  )
  .all(methodNotAllowed);

router
  .route("/events/:eventId/duplicate")
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.duplicateEvent,
  )
  .all(methodNotAllowed);

router
  .route("/events/:eventId/slots/debug")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    eventController.getSlotDebugReport,
  )
  .all(methodNotAllowed);

router
  .route("/events/:eventId/coaches/workload")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    eventController.getEventCoachWorkload,
  )
  .all(methodNotAllowed);

router
  .route("/events/:eventId/coaches")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    eventController.listEventCoaches,
  )
  .put(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.replaceEventCoaches,
  )
  .all(methodNotAllowed);

router
  .route("/events/:eventId/schedule-slots")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    eventController.listEventScheduleSlots,
  )
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.createEventScheduleSlot,
  )
  .all(methodNotAllowed);

router
  .route("/events/:eventId/schedule-slots/coach-availability")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.getCoachAvailabilityForProposedSlot,
  )
  .all(methodNotAllowed);

router
  .route("/events/:eventId/schedule-slots/:slotId")
  .patch(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.updateEventScheduleSlot,
  )
  .delete(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.deleteEventScheduleSlot,
  )
  .all(methodNotAllowed);

router
  .route("/events/:eventId/schedule-slots/:slotId/cancel")
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.cancelEventScheduleSlot,
  )
  .all(methodNotAllowed);

router
  .route("/events/:eventId/schedule-slots/:slotId/coach-availability")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    eventController.getCoachAvailabilityForSlot,
  )
  .all(methodNotAllowed);

router
  .route("/events/:eventId/schedule-slots/:slotId/reveal")
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    validate(RevealCoachSchema),
    eventController.revealCoachForSlot,
  )
  .all(methodNotAllowed);

router
  .route("/events/:eventId/schedule-slots/:slotId/bookings")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    eventController.listSlotBookings,
  )
  .all(methodNotAllowed);

router
  .route("/events/:eventId/schedule-slots/:slotId/log")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    eventController.getSessionLog,
  )
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    validate(UpsertSessionLogSchema),
    eventController.upsertSessionLog,
  )
  .all(methodNotAllowed);

router
  .route("/events/:eventId/coaches/:userId")
  .delete(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.removeEventCoach,
  )
  .all(methodNotAllowed);

router
  .route("/events/:eventId/coaches/:coachUserId/availability")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    validate(GetEventCoachAvailabilitySchema),
    eventController.getEventCoachAvailability,
  )
  .put(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    validate(SetEventCoachAvailabilitySchema),
    eventController.setEventCoachAvailability,
  )
  .all(methodNotAllowed);

router
  .route("/events/:eventId/recurrence-groups/:groupId/stop")
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.stopRecurrenceGroup,
  )
  .all(methodNotAllowed);

router
  .route("/events/:eventId/recurrence-groups/:groupId/resume")
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.resumeRecurrenceGroup,
  )
  .all(methodNotAllowed);

export default router;
