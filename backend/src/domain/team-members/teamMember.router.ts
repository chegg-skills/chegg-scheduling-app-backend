import express from "express";
import { UserRole } from "@prisma/client";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import { authenticate, authorize } from "../../shared/middleware/auth";
import * as teamMemberController from "./teamMember.controller";

import { validate } from "../../shared/middleware/validate";
import {
  AddTeamMemberSchema,
  TeamIdParamSchema,
  RemoveTeamMemberSchema,
} from "./teamMember.schema";

const router = express.Router();

router
  .route("/teams/:teamId/members")
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    validate(AddTeamMemberSchema),
    teamMemberController.addTeamMember,
  )
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    validate(TeamIdParamSchema),
    teamMemberController.listTeamMembers,
  )
  .all(methodNotAllowed);

router
  .route("/teams/:teamId/members/bulk")
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    validate(AddTeamMemberSchema),
    teamMemberController.addTeamMember,
  )
  .all(methodNotAllowed);

router
  .route("/teams/:teamId/members/:userId")
  .delete(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    validate(RemoveTeamMemberSchema),
    teamMemberController.removeTeamMember,
  )
  .all(methodNotAllowed);

export default router;