import express from "express";
import { UserRole } from "@prisma/client";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import { authenticate, authorize } from "../../shared/middleware/auth";
import * as teamMemberController from "./teamMember.controller";

const router = express.Router();

router
  .route("/teams/:teamId/members")
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    teamMemberController.addTeamMember,
  )
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    teamMemberController.listTeamMembers,
  )
  .all(methodNotAllowed);

router
  .route("/teams/:teamId/members/:userId")
  .delete(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    teamMemberController.removeTeamMember,
  )
  .all(methodNotAllowed);

export default router;