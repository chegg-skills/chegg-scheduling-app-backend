import express from "express";
import { UserRole } from "@prisma/client";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import * as inviteController from "./invite.controller";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { sensitiveLimiter } from "../../shared/middleware/rateLimit";

import { validate } from "../../shared/middleware/validate";
import { CreateInviteSchema, AcceptInviteSchema, ValidateInviteSchema } from "./invite.schema";

const router = express.Router();

// Admin creates an invite → sends token via email to the user
router
  .route("/")
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    validate(CreateInviteSchema),
    inviteController.createInvite,
  )
  .all(methodNotAllowed);

// User accepts the invite using the token from the email link
router
  .route("/accept-invite")
  .post(sensitiveLimiter, validate(AcceptInviteSchema), inviteController.acceptInvite)
  .all(methodNotAllowed);

// Public: validate an invite token and return its metadata (used by frontend to detect SSO invites)
router
  .route("/validate")
  .get(sensitiveLimiter, validate(ValidateInviteSchema), inviteController.validateInvite)
  .all(methodNotAllowed);

export default router;
