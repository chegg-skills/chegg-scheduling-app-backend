import express from "express";
import { UserRole } from "@prisma/client";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { validate } from "../../shared/middleware/validate";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import controller from "./systemSetting.controller";
import bookingQuestionController from "./bookingQuestion.controller";
import { UpdateSystemSettingsSchema } from "./systemSetting.schema";
import { CreateBookingQuestionSchema, UpdateBookingQuestionSchema } from "./bookingQuestion.schema";

const router = express.Router();

router
  .route("/")
  .get(authenticate, authorize(UserRole.SUPER_ADMIN), controller.getSystemSettingsController)
  .put(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(UpdateSystemSettingsSchema),
    controller.updateSystemSettingsController,
  )
  .all(methodNotAllowed);

router
  .route("/booking-questions")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    bookingQuestionController.listDefaultQuestionsController,
  )
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(CreateBookingQuestionSchema),
    bookingQuestionController.createDefaultQuestionController,
  )
  .all(methodNotAllowed);

router
  .route("/booking-questions/:id")
  .put(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(UpdateBookingQuestionSchema),
    bookingQuestionController.updateDefaultQuestionController,
  )
  .delete(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    bookingQuestionController.deleteDefaultQuestionController,
  )
  .all(methodNotAllowed);

export default router;
