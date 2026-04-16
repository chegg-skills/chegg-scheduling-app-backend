import express from "express";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import * as statsController from "./stats.controller";

import { validate } from "../../shared/middleware/validate";
import { StatsQuerySchema } from "./stats.schema";

const router = express.Router();

router
  .route("/dashboard")
  .get(validate(StatsQuerySchema), statsController.getDashboardStats)
  .all(methodNotAllowed);
router
  .route("/bookings")
  .get(validate(StatsQuerySchema), statsController.getBookingStats)
  .all(methodNotAllowed);
router
  .route("/users")
  .get(validate(StatsQuerySchema), statsController.getUserStats)
  .all(methodNotAllowed);
router
  .route("/teams")
  .get(validate(StatsQuerySchema), statsController.getTeamStats)
  .all(methodNotAllowed);
router
  .route("/events")
  .get(validate(StatsQuerySchema), statsController.getEventStats)
  .all(methodNotAllowed);
router
  .route("/offerings")
  .get(validate(StatsQuerySchema), statsController.getOfferingStats)
  .all(methodNotAllowed);
router
  .route("/interaction-types")
  .get(validate(StatsQuerySchema), statsController.getInteractionTypeStats)
  .all(methodNotAllowed);
router
  .route("/trends")
  .get(validate(StatsQuerySchema), statsController.getBookingTrends)
  .all(methodNotAllowed);
router
  .route("/teams/performance")
  .get(validate(StatsQuerySchema), statsController.getTeamPerformance)
  .all(methodNotAllowed);
router
  .route("/activity/peaks")
  .get(validate(StatsQuerySchema), statsController.getPeakActivity)
  .all(methodNotAllowed);

export default router;
