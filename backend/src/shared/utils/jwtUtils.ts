import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../error/errorhandler";
import type { SafeUser } from "./userUtils";

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new ErrorHandler(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "JWT_SECRET is not configured."
    );
  }
  return secret;
};

export const buildAuthToken = (user: SafeUser): string => {
  const expiresInSeconds = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 86400);
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    getJwtSecret(),
    { expiresIn: expiresInSeconds }
  );
};
