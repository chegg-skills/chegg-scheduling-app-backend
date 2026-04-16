import express from "express";
import { UserRole } from "@prisma/client";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import type { RequestHandler } from "express";
import * as authController from "./auth.controller";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { sensitiveLimiter, strictLimiter } from "../../shared/middleware/rateLimit";
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

router.route("/logout").post(authenticate, authController.logout).all(methodNotAllowed);

// One-time bootstrap — only works when no users exist, requires BOOTSTRAP_SECRET
router.route("/bootstrap").post(strictLimiter, authController.bootstrap).all(methodNotAllowed);

export default router;
