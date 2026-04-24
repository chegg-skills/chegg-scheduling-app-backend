import express from "express";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import * as ssoController from "./sso.controller";
import { sensitiveLimiter } from "../../shared/middleware/rateLimit";

const router = express.Router();

// Initiates SSO login flow — browser redirect to IdP
router
  .route("/login")
  .get(sensitiveLimiter, ssoController.initiateLogin)
  .all(methodNotAllowed);

// Initiates SSO invite-acceptance flow (requires ?token=<inviteToken>)
router
  .route("/accept-invite")
  .get(sensitiveLimiter, ssoController.initiateInviteAcceptance)
  .all(methodNotAllowed);

// OIDC callback — no rate limiter (IdP redirects here; limiting breaks legit users)
router
  .route("/callback")
  .get(ssoController.handleCallback)
  .all(methodNotAllowed);

export default router;
