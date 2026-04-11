import express from "express";
import { UserRole } from "@prisma/client";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import { authenticate, authorize } from "../../shared/middleware/auth";
import * as userController from "./user.controller";
import availabilityRouter from '../availability/availability.router';
import { validate } from "../../shared/middleware/validate";
import {
  ListUsersSchema,
  UpdateUserSchema,
  UpdateMyProfileSchema,
} from "./user.schema";

const router = express.Router();

router
  .route("/")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    validate(ListUsersSchema),
    userController.listUsers,
  )
  .all(methodNotAllowed);

router
  .route("/me")
  .get(
    authenticate,
    userController.readMyProfile,
  )
  .patch(
    authenticate,
    validate(UpdateMyProfileSchema),
    userController.updateMyProfile,
  )
  .all(methodNotAllowed);

router
  .route("/:userId")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    userController.readUser,
  )
  .put(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    validate(UpdateUserSchema),
    userController.updateUser,
  )
  .patch(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    validate(UpdateUserSchema),
    userController.updateUser,
  )
  .delete(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    userController.deleteUser,
  )
  .all(methodNotAllowed);

// Mount user availability routes
// Mount availability routes from the dedicated domain
router.use("/:userId/availability", authenticate, availabilityRouter);

export default router;
