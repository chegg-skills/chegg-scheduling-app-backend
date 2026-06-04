import { Router } from "express";
import * as BookingController from "./booking.controller";
import { authenticate, optionalAuthenticate, authorize } from "../../shared/middleware/auth";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import { UserRole } from "@prisma/client";
import { validate } from "../../shared/middleware/validate";
import {
  bookingCreationLimiter,
  sensitiveLimiter,
  standardLimiter,
} from "../../shared/middleware/rateLimit";
import {
  BookingIdParamSchema,
  CancelBookingSchema,
  CreateBookingSchema,
  ListBookingsSchema,
  RescheduleBookingSchema,
  UpdateBookingStatusSchema,
  UpsertBookingSessionLogSchema,
  BookFollowUpSchema,
} from "./booking.schema";

const router = Router();

/**
 * Booking Endpoints
 */
router
  .route("/")
  .post(bookingCreationLimiter, validate(CreateBookingSchema), BookingController.createBooking) // Public for students to book
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
  .post(
    standardLimiter,
    optionalAuthenticate,
    validate(RescheduleBookingSchema),
    BookingController.rescheduleBooking,
  ) // Token auth or session auth handled in controller
  .all(methodNotAllowed);

router
  .route("/:bookingId/cancel")
  .post(
    sensitiveLimiter,
    optionalAuthenticate,
    validate(CancelBookingSchema),
    BookingController.cancelBooking,
  )
  .all(methodNotAllowed);

router
  .route("/:bookingId/follow-up")
  .post(
    standardLimiter,
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    validate(BookFollowUpSchema),
    BookingController.bookFollowUpSession,
  )
  .all(methodNotAllowed);

router
  .route("/:bookingId/log")
  .get(authenticate, validate(BookingIdParamSchema), BookingController.getBookingSessionLog)
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    validate(UpsertBookingSessionLogSchema),
    BookingController.upsertBookingSessionLog,
  )
  .all(methodNotAllowed);

export default router;
