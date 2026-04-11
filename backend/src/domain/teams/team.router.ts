import express from "express";
import { UserRole } from "@prisma/client";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import { authenticate, authorize } from "../../shared/middleware/auth";
import * as teamController from "./team.controller";
import { validate } from "../../shared/middleware/validate";
import {
  CreateTeamSchema,
  ListTeamsSchema,
  UpdateTeamSchema,
} from "./team.schema";

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
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    validate(ListTeamsSchema),
    teamController.listTeams,
  )
  .all(methodNotAllowed);

router
  .route("/:teamId")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    teamController.readTeam,
  )
  .patch(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(UpdateTeamSchema),
    teamController.updateTeam,
  )
  .delete(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    teamController.deleteTeam,
  )
  .all(methodNotAllowed);

export default router;
