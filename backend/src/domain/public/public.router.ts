import express from "express";
import * as PublicController from "./public.controller";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";

import { validate } from "../../shared/middleware/validate";
import {
  PublicSlugSchema,
  ListTeamEventsSchema,
  GetAvailableSlotsSchema,
  GetPublicBookingSchema,
} from "./public.schema";

const router = express.Router();

router.route("/teams").get(PublicController.listTeams).all(methodNotAllowed);

router
  .route("/teams/slug/:slug")
  .get(validate(PublicSlugSchema), PublicController.getTeamBySlug)
  .all(methodNotAllowed);

router
  .route("/teams/slug/:slug/events")
  .get(validate(PublicSlugSchema), PublicController.listTeamEventsBySlug)
  .all(methodNotAllowed);

router
  .route("/teams/:teamId/events")
  .get(validate(ListTeamEventsSchema), PublicController.listTeamEvents)
  .all(methodNotAllowed);

router
  .route("/events/slug/:slug")
  .get(validate(PublicSlugSchema), PublicController.getEventBySlug)
  .all(methodNotAllowed);

router
  .route("/coaches/slug/:slug")
  .get(validate(PublicSlugSchema), PublicController.getCoachBySlug)
  .all(methodNotAllowed);

router
  .route("/coaches/slug/:slug/events")
  .get(validate(PublicSlugSchema), PublicController.listCoachEventsBySlug)
  .all(methodNotAllowed);

router
  .route("/events/:eventId/slots")
  .get(validate(GetAvailableSlotsSchema), PublicController.getAvailableSlots)
  .all(methodNotAllowed);

router
  .route("/bookings/:id")
  .get(validate(GetPublicBookingSchema), PublicController.getPublicBooking)
  .all(methodNotAllowed);

export default router;
