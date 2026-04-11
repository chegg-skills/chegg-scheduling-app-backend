import { Router } from "express";
import * as BookingController from "./booking.controller";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import { UserRole } from "@prisma/client";
import { validate } from "../../shared/middleware/validate";
import {
  CreateBookingSchema,
  ListBookingsSchema,
  RescheduleBookingSchema,
  UpdateBookingStatusSchema,
} from "./booking.schema";

const router = Router();

/**
 * Booking Endpoints
 */
router
  .route("/")
  .post(validate(CreateBookingSchema), BookingController.createBooking) // Public for students to book
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    validate(ListBookingsSchema),
    BookingController.listBookings,
  )
  .all(methodNotAllowed);

router
  .route("/:bookingId")
  .get(authenticate, BookingController.getBooking)
  .patch(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    validate(UpdateBookingStatusSchema),
    BookingController.updateBooking,
  )
  .all(methodNotAllowed);

router
  .route("/:bookingId/reschedule")
  .post(validate(RescheduleBookingSchema), BookingController.rescheduleBooking) // Token auth or session auth handled in controller
  .all(methodNotAllowed);

export default router;
