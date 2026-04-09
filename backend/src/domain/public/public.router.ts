import express from "express";
import * as PublicController from "./public.controller";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";

const router = express.Router();

router
    .route("/teams")
    .get(PublicController.listTeams)
    .all(methodNotAllowed);

router
    .route("/teams/slug/:slug")
    .get(PublicController.getTeamBySlug)
    .all(methodNotAllowed);

router
    .route("/teams/slug/:slug/events")
    .get(PublicController.listTeamEventsBySlug)
    .all(methodNotAllowed);

router
    .route("/teams/:teamId/events")
    .get(PublicController.listTeamEvents)
    .all(methodNotAllowed);

router
    .route("/events/slug/:slug")
    .get(PublicController.getEventBySlug)
    .all(methodNotAllowed);

router
    .route("/coaches/slug/:slug")
    .get(PublicController.getCoachBySlug)
    .all(methodNotAllowed);

router
    .route("/coaches/slug/:slug/events")
    .get(PublicController.listCoachEventsBySlug)
    .all(methodNotAllowed);

router
    .route("/events/:eventId/slots")
    .get(PublicController.getAvailableSlots)
    .all(methodNotAllowed);

router
    .route("/bookings/:id")
    .get(PublicController.getPublicBooking)
    .all(methodNotAllowed);

export default router;
