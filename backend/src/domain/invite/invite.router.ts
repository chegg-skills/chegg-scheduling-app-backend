import express from "express";
import { UserRole } from "@prisma/client";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import * as inviteController from "./invite.controller";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { sensitiveLimiter } from "../../shared/middleware/rateLimit";

import { validate } from "../../shared/middleware/validate";
import { CreateInviteSchema, AcceptInviteSchema, ValidateInviteSchema, ListInvitesSchema } from "./invite.schema";

const router = express.Router();

// Admin creates an invite / lists all invites
router
  .route("/")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    validate(ListInvitesSchema),
    inviteController.listInvites,
  )
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
  .post(sensitiveLimiter, validate(ValidateInviteSchema), inviteController.validateInvite)
  .all(methodNotAllowed);

// Revoke a pending invite by id — must come AFTER specific literal paths (/accept-invite, /validate)
router
  .route("/:id")
  .delete(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    inviteController.revokeInvite,
  )
  .all(methodNotAllowed);

export default router;
