import type { Response } from "express";

export const AUTH_COOKIE_NAME = "auth_token";

const getCookieSameSite = (): "lax" | "strict" | "none" => {
  const sameSite = process.env.COOKIE_SAME_SITE?.toLowerCase();
  if (sameSite === "none" || sameSite === "strict" || sameSite === "lax") {
    return sameSite;
  }
  return "lax";
};

const buildCookieOptions = () => {
  const sameSite = getCookieSameSite();
  return {
    httpOnly: true,
    sameSite,
    secure: process.env.NODE_ENV === "production" || sameSite === "none",
  } as const;
};

export const setAuthCookie = (res: Response, token: string): void => {
  const maxAgeMs = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 86400) * 1000;
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...buildCookieOptions(),
    maxAge: maxAgeMs,
  });
};

export const clearAuthCookie = (res: Response): void => {
  res.clearCookie(AUTH_COOKIE_NAME, buildCookieOptions());
};
