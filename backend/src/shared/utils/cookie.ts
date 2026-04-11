import { randomUUID } from "node:crypto";
import type { Response } from "express";

export const AUTH_COOKIE_NAME = "auth_token";
export const CSRF_COOKIE_NAME = "csrf_token";
export const CSRF_HEADER_NAME = "x-csrf-token";

const getCookieSameSite = (): "lax" | "strict" | "none" => {
  const sameSite = process.env.COOKIE_SAME_SITE?.toLowerCase();
  if (sameSite === "none" || sameSite === "strict" || sameSite === "lax") {
    return sameSite as "lax" | "strict" | "none";
  }
  // Default to 'none' in production to support cross-site requests (e.g. onrender.com subdomains)
  return process.env.NODE_ENV === "production" ? "none" : "lax";
};

const buildCookieOptions = (httpOnly: boolean) => {
  const sameSite = getCookieSameSite();
  return {
    httpOnly,
    sameSite,
    secure: process.env.NODE_ENV === "production" || sameSite === "none",
  } as const;
};

export const setCsrfCookie = (res: Response, token = randomUUID()): string => {
  const maxAgeMs = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 86400) * 1000;
  res.cookie(CSRF_COOKIE_NAME, token, {
    ...buildCookieOptions(false),
    maxAge: maxAgeMs,
  });
  return token;
};

export const clearCsrfCookie = (res: Response): void => {
  res.clearCookie(CSRF_COOKIE_NAME, buildCookieOptions(false));
};

export const setAuthCookie = (res: Response, token: string): void => {
  const maxAgeMs = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 86400) * 1000;
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...buildCookieOptions(true),
    maxAge: maxAgeMs,
  });
  setCsrfCookie(res);
};

export const clearAuthCookie = (res: Response): void => {
  res.clearCookie(AUTH_COOKIE_NAME, buildCookieOptions(true));
  clearCsrfCookie(res);
};
