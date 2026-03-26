import express from "express";
import { UserRole } from "@prisma/client";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import * as inviteController from "./invite.controller";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { sensitiveLimiter } from "../../shared/middleware/rateLimit";

const router = express.Router();

// Admin creates an invite → sends token via email to the user
router
  .route("/")
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    inviteController.createInvite
  )
  .all(methodNotAllowed);

// User accepts the invite using the token from the email link
router
  .route("/accept-invite")
  .post(sensitiveLimiter, inviteController.acceptInvite)
  .all(methodNotAllowed);

export default router;
