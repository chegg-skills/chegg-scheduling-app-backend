import express from "express";
import { UserRole } from "@prisma/client";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import { authenticate, authorize } from "../../shared/middleware/auth";
import * as eventController from "./event.controller";
import { validate } from "../../shared/middleware/validate";
import {
  CreateEventSchema,
  ListTeamEventsSchema,
  ListAllEventsSchema,
  UpdateEventSchema,
  UpsertSessionLogSchema,
} from "./event.schema";

const router = express.Router();

router
  .route("/event-offerings")
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.createEventOffering,
  )
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.listEventOfferings,
  )
  .all(methodNotAllowed);

router
  .route("/event-offerings/:offeringId")
  .patch(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.updateEventOffering,
  )
  .delete(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.deleteEventOffering,
  )
  .all(methodNotAllowed);

router
  .route("/event-offerings/:offeringId/usage")
  .get(authenticate, authorize(UserRole.SUPER_ADMIN), eventController.getEventOfferingUsage)
  .all(methodNotAllowed);

router
  .route("/event-interaction-types")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
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
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    validate(ListAllEventsSchema),
    eventController.listAllEvents,
  )
  .all(methodNotAllowed);

router
  .route("/events/:eventId")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
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
  .route("/events/:eventId/coaches")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
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
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.listEventScheduleSlots,
  )
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.createEventScheduleSlot,
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
  .route("/events/:eventId/schedule-slots/:slotId/bookings")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
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

export default router;
