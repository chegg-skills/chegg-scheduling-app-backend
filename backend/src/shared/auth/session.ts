import type { Request, Response } from "express";
import { setRefreshCookie } from "./cookie";
import { issueRefreshToken, type RefreshTokenMeta } from "./refreshTokenUtils";

const buildRefreshTokenMeta = (req: Request): RefreshTokenMeta => ({
  userAgent: req.get("user-agent") ?? null,
  ipAddress: req.ip ?? null,
});

/**
 * Issues a refresh token for a freshly authenticated user and attaches it as the
 * refresh cookie. Called immediately after `setAuthCookie` at every point where a
 * session begins — password login, registration, bootstrap, invite acceptance and
 * both SSO entry paths — so all of them produce the same access + refresh pair.
 */
export const establishRefreshSession = async (
  req: Request,
  res: Response,
  userId: string,
): Promise<void> => {
  const refreshToken = await issueRefreshToken(userId, buildRefreshTokenMeta(req));
  setRefreshCookie(res, refreshToken);
};
