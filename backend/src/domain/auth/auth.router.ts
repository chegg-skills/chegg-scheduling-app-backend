import express from "express";
import { UserRole } from "@prisma/client";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import type { RequestHandler } from "express";
import authController from "./auth.controller";
import { authenticate, authorize, optionalAuthenticate } from "../../shared/middleware/auth";
import {
  refreshIpLimiter,
  refreshLimiter,
  sensitiveLimiter,
  strictLimiter,
} from "../../shared/middleware/rateLimit";
import { validate } from "../../shared/middleware/validate";
import {
  LoginSchema,
  RegisterSchema,
  ResetPasswordRequestSchema,
  ResetPasswordSchema,
} from "./auth.schema";

const router = express.Router();

const selfRegisterEnabled = process.env.ALLOW_SELF_REGISTER === "true";

const registerHandlers: RequestHandler[] = selfRegisterEnabled
  ? [sensitiveLimiter, validate(RegisterSchema), authController.register]
  : [
      authenticate,
      authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
      validate(RegisterSchema),
      authController.register,
    ];

router
  .route("/register")
  .post(...registerHandlers)
  .all(methodNotAllowed);

router
  .route("/login")
  .post(sensitiveLimiter, validate(LoginSchema), authController.login)
  .all(methodNotAllowed);

// Authenticated by possession of the refresh cookie alone — deliberately not
// behind `authenticate`, since the whole point is to be callable once the access
// token has already expired.
// Two tiers: a wide per-IP ceiling that stops floods of random cookies, then a
// tight per-session budget. Neither substitutes for the other — see rateLimit.ts.
router
  .route("/refresh")
  .post(refreshIpLimiter, refreshLimiter, authController.refresh)
  .all(methodNotAllowed);

// `optionalAuthenticate`, not `authenticate`: the access token expires long before
// the session does, and requiring it would 401 an idle user's logout — leaving their
// refresh token un-revoked and the session resumable. Logout is idempotent; the CSRF
// middleware is what stops a cross-site page from triggering it.
router.route("/logout").post(optionalAuthenticate, authController.logout).all(methodNotAllowed);

// One-time bootstrap — only works when no users exist, requires BOOTSTRAP_SECRET
router.route("/bootstrap").post(strictLimiter, authController.bootstrap).all(methodNotAllowed);

export default router;
