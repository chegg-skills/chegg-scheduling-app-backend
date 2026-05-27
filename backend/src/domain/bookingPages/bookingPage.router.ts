import express from "express";
import { UserRole } from "@prisma/client";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { validate } from "../../shared/middleware/validate";
import * as bookingPageController from "./bookingPage.controller";
import {
  CreateBookingPageSchema,
  UpdateBookingPageSchema,
  BookingPageParamsSchema,
  AddSectionSchema,
  SectionParamsSchema,
  AddTeamToSectionSchema,
  TeamInSectionParamsSchema,
} from "./bookingPage.schema";

const router = express.Router();

router
  .route("/booking-pages")
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(CreateBookingPageSchema),
    bookingPageController.createBookingPage,
  )
  .get(authenticate, authorize(UserRole.SUPER_ADMIN), bookingPageController.listBookingPages)
  .all(methodNotAllowed);

router
  .route("/booking-pages/:pageId")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(BookingPageParamsSchema),
    bookingPageController.getBookingPage,
  )
  .patch(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(UpdateBookingPageSchema),
    bookingPageController.updateBookingPage,
  )
  .delete(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(BookingPageParamsSchema),
    bookingPageController.deleteBookingPage,
  )
  .all(methodNotAllowed);

router
  .route("/booking-pages/:pageId/sections")
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(AddSectionSchema),
    bookingPageController.addSection,
  )
  .all(methodNotAllowed);

router
  .route("/booking-pages/:pageId/sections/:sectionId")
  .delete(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(SectionParamsSchema),
    bookingPageController.removeSection,
  )
  .all(methodNotAllowed);

router
  .route("/booking-pages/:pageId/sections/:sectionId/teams")
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(AddTeamToSectionSchema),
    bookingPageController.addTeamToSection,
  )
  .all(methodNotAllowed);

router
  .route("/booking-pages/:pageId/sections/:sectionId/teams/:teamId")
  .delete(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(TeamInSectionParamsSchema),
    bookingPageController.removeTeamFromSection,
  )
  .all(methodNotAllowed);

export default router;
