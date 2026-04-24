import type { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import { logger } from "../../shared/logging/logger";
import { buildAuthToken } from "../../shared/utils/jwtUtils";
import { setAuthCookie } from "../../shared/utils/cookie";
import { createPublicBookingSlug } from "../../shared/utils/publicBookingSlug";
import { normalizeEmail, toSafeUser } from "../../shared/utils/userUtils";
import {
  buildAuthorizationUrl,
  exchangeCodeForUserInfo,
  generateState,
  generateNonce,
} from "../../shared/utils/oidcClient";
import {
  queueInviteAcceptedNotification,
} from "../invite/invite.notification";

const SSO_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const getProvider = (): string => {
  return process.env.OIDC_PROVIDER_NAME ?? "sso";
};

const getFrontendUrl = (): string => {
  return process.env.FRONTEND_URL ?? "http://localhost:3000";
};

const redirectError = (res: Response, reason: string): void => {
  res.redirect(`${getFrontendUrl()}/sso/error?reason=${encodeURIComponent(reason)}`);
};

/**
 * GET /auth/sso/login
 * Initiates the OIDC authorization flow for regular login.
 */
export const initiateLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const state = generateState();
    const nonce = generateNonce();
    const expiresAt = new Date(Date.now() + SSO_STATE_TTL_MS);

    await prisma.oidcState.create({
      data: { state, nonce, inviteToken: null, expiresAt },
    });

    const authUrl = await buildAuthorizationUrl(state, nonce);
    res.redirect(authUrl);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /auth/sso/accept-invite?token=<inviteToken>
 * Initiates the OIDC flow for accepting an SSO-required invite.
 */
export const initiateInviteAcceptance = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const inviteToken = req.query.token as string | undefined;

    if (!inviteToken) {
      redirectError(res, "missing_invite_token");
      return;
    }

    const invite = await prisma.userInvite.findUnique({ where: { token: inviteToken } });

    if (!invite) {
      redirectError(res, "invite_not_found");
      return;
    }
    if (invite.acceptedAt) {
      redirectError(res, "invite_already_accepted");
      return;
    }
    if (new Date() > invite.expiresAt) {
      redirectError(res, "invite_expired");
      return;
    }
    if (!invite.requiresSso) {
      redirectError(res, "invite_not_sso");
      return;
    }

    const state = generateState();
    const nonce = generateNonce();
    const expiresAt = new Date(Date.now() + SSO_STATE_TTL_MS);

    await prisma.oidcState.create({
      data: { state, nonce, inviteToken, expiresAt },
    });

    const authUrl = await buildAuthorizationUrl(state, nonce);
    res.redirect(authUrl);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /auth/sso/callback
 * Handles the OIDC provider callback after user authentication.
 * Routes to new-user provisioning (invite path) or existing-user login.
 */
export const handleCallback = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const stateParam = req.query.state as string | undefined;

  if (!stateParam) {
    redirectError(res, "invalid_state");
    return;
  }

  // Validate and consume the state (one-time use)
  const oidcState = await prisma.oidcState.findUnique({ where: { state: stateParam } });

  // Clean up expired states opportunistically
  void prisma.oidcState.deleteMany({ where: { expiresAt: { lt: new Date() } } });

  if (!oidcState || oidcState.expiresAt < new Date()) {
    if (oidcState) {
      await prisma.oidcState.delete({ where: { id: oidcState.id } });
    }
    redirectError(res, "invalid_state");
    return;
  }

  // Delete the state row immediately — one-time use
  await prisma.oidcState.delete({ where: { id: oidcState.id } });

  try {
    const callbackParams = req.query as Record<string, string>;
    const userInfo = await exchangeCodeForUserInfo(callbackParams, stateParam, oidcState.nonce);

    const normalizedEmail = normalizeEmail(userInfo.email);
    const provider = getProvider();

    if (oidcState.inviteToken) {
      await handleInviteAcceptance(res, oidcState.inviteToken, normalizedEmail, userInfo.sub, provider, userInfo);
    } else {
      await handleExistingUserLogin(res, normalizedEmail, userInfo.sub, provider);
    }
  } catch (error) {
    logger.error("SSO callback failed.", { error });
    next(error);
  }
};

type OidcUserInfoPartial = {
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
};

async function handleInviteAcceptance(
  res: Response,
  inviteToken: string,
  normalizedEmail: string,
  ssoSub: string,
  provider: string,
  userInfo: OidcUserInfoPartial,
): Promise<void> {
  const invite = await prisma.userInvite.findUnique({ where: { token: inviteToken } });

  if (!invite || invite.acceptedAt || new Date() > invite.expiresAt) {
    redirectError(res, "invite_expired");
    return;
  }

  if (normalizeEmail(invite.email) !== normalizedEmail) {
    logger.warn("SSO email does not match invite email.", {
      inviteEmail: invite.email,
      ssoEmail: normalizedEmail,
    });
    redirectError(res, "email_mismatch");
    return;
  }

  // SUPER_ADMIN can never be created via SSO
  if (invite.role === UserRole.SUPER_ADMIN) {
    logger.warn("SSO invite acceptance rejected: SUPER_ADMIN role not allowed via SSO.", {
      inviteId: invite.id,
    });
    redirectError(res, "forbidden");
    return;
  }

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    redirectError(res, "user_already_exists");
    return;
  }

  const deriveName = (info: OidcUserInfoPartial) => {
    if (info.given_name) return { firstName: info.given_name, lastName: info.family_name ?? "" };
    if (info.name) {
      const parts = info.name.trim().split(/\s+/);
      return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
    }
    return { firstName: normalizedEmail.split("@")[0], lastName: "" };
  };

  const { firstName, lastName } = deriveName(userInfo);

  const [createdUser] = await prisma.$transaction([
    prisma.user.create({
      data: {
        email: normalizedEmail,
        password: null,
        role: invite.role,
        firstName,
        lastName,
        timezone: "UTC",
        publicBookingSlug: createPublicBookingSlug(`${firstName} ${lastName}`, "coach"),
        ssoProvider: provider,
        ssoSub,
        ssoLinkedAt: new Date(),
      },
    }),
    prisma.userInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  const safeUser = toSafeUser(createdUser);

  logger.info("SSO invite accepted and user provisioned.", {
    userId: safeUser.id,
    role: safeUser.role,
    provider,
  });

  void queueInviteAcceptedNotification({
    invitedById: invite.createdBy,
    inviteeName: `${firstName} ${lastName}`.trim(),
    inviteeEmail: normalizedEmail,
    role: invite.role,
  });

  const token = buildAuthToken(safeUser);
  setAuthCookie(res, token);
  res.redirect(`${getFrontendUrl()}/dashboard`);
}

async function handleExistingUserLogin(
  res: Response,
  normalizedEmail: string,
  ssoSub: string,
  provider: string,
): Promise<void> {
  // Look up by (provider, sub) first — the canonical SSO identity
  let user = await prisma.user.findUnique({
    where: { ssoProvider_ssoSub: { ssoProvider: provider, ssoSub } },
  });

  // Auto-link: existing password user logs in via SSO for the first time
  if (!user) {
    const userByEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (userByEmail) {
      user = await prisma.user.update({
        where: { id: userByEmail.id },
        data: { ssoProvider: provider, ssoSub, ssoLinkedAt: new Date() },
      });
      logger.info("SSO identity linked to existing user.", {
        userId: user.id,
        provider,
      });
    }
  }

  if (!user) {
    logger.warn("SSO login rejected: no account found for identity.", {
      email: normalizedEmail,
      provider,
    });
    redirectError(res, "no_account");
    return;
  }

  if (!user.isActive) {
    logger.warn("SSO login rejected: account inactive.", { userId: user.id });
    redirectError(res, "inactive");
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
  });

  const safeUser = toSafeUser(user);

  logger.info("SSO login successful.", { userId: safeUser.id, role: safeUser.role, provider });

  const token = buildAuthToken(safeUser);
  setAuthCookie(res, token);
  res.redirect(`${getFrontendUrl()}/dashboard`);
}
