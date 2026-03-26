import express from "express";
import { UserRole } from "@prisma/client";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import { authenticate, authorize } from "../../shared/middleware/auth";
import * as eventController from "./event.controller";

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
  .all(methodNotAllowed);

router
  .route("/event-interaction-types")
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.createInteractionType,
  )
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.listInteractionTypes,
  )
  .all(methodNotAllowed);

router
  .route("/event-interaction-types/:interactionTypeId")
  .patch(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.updateInteractionType,
  )
  .all(methodNotAllowed);

router
  .route("/teams/:teamId/events")
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.createEvent,
  )
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.listTeamEvents,
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
    eventController.updateEvent,
  )
  .delete(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.deleteEvent,
  )
  .all(methodNotAllowed);

router
  .route("/events/:eventId/hosts")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.listEventHosts,
  )
  .put(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.replaceEventHosts,
  )
  .all(methodNotAllowed);

router
  .route("/events/:eventId/hosts/:userId")
  .delete(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    eventController.removeEventHost,
  )
  .all(methodNotAllowed);

export default router;