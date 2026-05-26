import express from "express";
import { UserRole } from "@prisma/client";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { validate } from "../../shared/middleware/validate";
import * as sessionTypeController from "./sessionType.controller";
import {
  CreateSessionTypeSchema,
  UpdateSessionTypeSchema,
  SessionTypeParamsSchema,
} from "./sessionType.schema";

const router = express.Router();

router
  .route("/session-types")
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(CreateSessionTypeSchema),
    sessionTypeController.createSessionType,
  )
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    sessionTypeController.listSessionTypes,
  )
  .all(methodNotAllowed);

router
  .route("/session-types/:sessionTypeId")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    validate(SessionTypeParamsSchema),
    sessionTypeController.getSessionType,
  )
  .patch(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(UpdateSessionTypeSchema),
    sessionTypeController.updateSessionType,
  )
  .delete(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(SessionTypeParamsSchema),
    sessionTypeController.deleteSessionType,
  )
  .all(methodNotAllowed);

export default router;
