import express from "express";
import statsRoutes from "../../domain/stats/stats.router";
import reportsRoutes from "../../domain/reports/report.router";
import trackerRoutes from "../../domain/tracker/tracker.router";
import BookingController from "../../domain/bookings/booking.controller";
import { authenticate } from "../../shared/middleware/auth";
import { validate } from "../../shared/middleware/validate";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import { GetBookingTimelineSchema } from "../../domain/bookings/booking.schema";

const router = express.Router();

router.get("/", (_req, res) => {
  res.send("API v1 is working!");
});

router.use("/stats", statsRoutes);
router.use("/reports", reportsRoutes);
router.use("/tracker", trackerRoutes);

router
  .route("/bookings/:bookingId/timeline")
  .get(authenticate, validate(GetBookingTimelineSchema), BookingController.getBookingTimeline)
  .all(methodNotAllowed);

export default router;
