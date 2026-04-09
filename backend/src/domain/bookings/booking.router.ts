import { Router } from "express";
import * as BookingController from "./booking.controller";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import { UserRole } from "@prisma/client";

const router = Router();

/**
 * Booking Endpoints
 */
router
  .route("/")
  .post(BookingController.createBooking) // Public for students to book
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    BookingController.listBookings,
  )
  .all(methodNotAllowed);

router
  .route("/:id")
  .get(authenticate, BookingController.getBooking)
  .patch(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    BookingController.updateBooking,
  )
  .all(methodNotAllowed);

export default router;
