import express from "express";
import { UserRole } from "@prisma/client";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { validate } from "../../shared/middleware/validate";
import bookingDirectoryController from "./bookingDirectory.module";
import {
  CreateBookingDirectorySchema,
  UpdateBookingDirectorySchema,
  BookingDirectoryParamsSchema,
  AddSectionSchema,
  SectionParamsSchema,
  AddTeamToSectionSchema,
  TeamInSectionParamsSchema,
} from "./bookingDirectory.schema";
import { standardLimiter } from "../../shared/middleware/rateLimit";

const router = express.Router();

// All booking-directory routes are authenticated admin APIs: apply the standard tier
// ahead of auth, as the bookings router does.
router.use(standardLimiter);

router
  .route("/")
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(CreateBookingDirectorySchema),
    bookingDirectoryController.createBookingDirectory,
  )
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    bookingDirectoryController.listBookingDirectories,
  )
  .all(methodNotAllowed);

router
  .route("/:directoryId")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(BookingDirectoryParamsSchema),
    bookingDirectoryController.getBookingDirectory,
  )
  .patch(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(UpdateBookingDirectorySchema),
    bookingDirectoryController.updateBookingDirectory,
  )
  .delete(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(BookingDirectoryParamsSchema),
    bookingDirectoryController.deleteBookingDirectory,
  )
  .all(methodNotAllowed);

router
  .route("/:directoryId/sections")
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(AddSectionSchema),
    bookingDirectoryController.addSection,
  )
  .all(methodNotAllowed);

router
  .route("/:directoryId/sections/:sectionId")
  .delete(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(SectionParamsSchema),
    bookingDirectoryController.removeSection,
  )
  .all(methodNotAllowed);

router
  .route("/:directoryId/sections/:sectionId/teams")
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(AddTeamToSectionSchema),
    bookingDirectoryController.addTeamToSection,
  )
  .all(methodNotAllowed);

router
  .route("/:directoryId/sections/:sectionId/teams/:teamId")
  .delete(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(TeamInSectionParamsSchema),
    bookingDirectoryController.removeTeamFromSection,
  )
  .all(methodNotAllowed);

export default router;
