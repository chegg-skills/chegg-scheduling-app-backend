import express from "express";
import { UserRole } from "@prisma/client";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import { authenticate, authorize } from "../../shared/middleware/auth";
import teamController from "./team.controller";
import teamNotifConfigController from "./team.notificationConfig.controller";
import { validate } from "../../shared/middleware/validate";
import { CreateTeamSchema, ListTeamsSchema, UpdateTeamSchema } from "./team.schema";
import {
  GetNotificationConfigSchema,
  UpsertNotificationConfigSchema,
} from "./team.notificationConfig.schema";

const router = express.Router();

router
  .route("/")
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(CreateTeamSchema),
    teamController.createTeam,
  )
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    validate(ListTeamsSchema),
    teamController.listTeams,
  )
  .all(methodNotAllowed);

router
  .route("/:teamId")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    teamController.readTeam,
  )
  .patch(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(UpdateTeamSchema),
    teamController.updateTeam,
  )
  .delete(authenticate, authorize(UserRole.SUPER_ADMIN), teamController.deleteTeam)
  .all(methodNotAllowed);

router
  .route("/:teamId/notification-config")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    validate(GetNotificationConfigSchema),
    teamNotifConfigController.getNotificationConfig,
  )
  .put(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    validate(UpsertNotificationConfigSchema),
    teamNotifConfigController.upsertNotificationConfig,
  )
  .all(methodNotAllowed);

export default router;
