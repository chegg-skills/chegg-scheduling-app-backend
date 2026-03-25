import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import * as inviteService from "./invite.service";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import { setAuthCookie } from "../../shared/utils/cookie";

/**
 * POST /api/invites
 * Admin sends invite to a user with a specific role.
 */
const createInvite = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminId = res.locals.authUser.id as string;

    const result = await inviteService.createInvite({
      email: req.body.email,
      role: req.body.role,
      createdByAdminId: adminId,
    });

    // TODO: Trigger email service here to send invite link to result.email
    // The email should include: FRONTEND_URL/accept-invite?token=result.token
      // Do NOT expose result.token in the HTTP response in production.
      
    // for development/testing purposes, we include the token in the response. Remove this before deploying to production.

    sendSuccessResponse(
      res,
      StatusCodes.CREATED,
      {
        id: result.id,
        email: result.email,
        role: result.role,
        // Expose the token in every non-production environment so integration
        // tests (NODE_ENV=test) can use it without a real email service.
        token: process.env.NODE_ENV !== "production" ? result.token : undefined,
        expiresAt: result.expiresAt,
        createdAt: result.createdAt,
      },
      "Invite sent successfully."
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/invites/accept
 * User accepts an invite using the token from the email link.
 */
const acceptInvite = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await inviteService.acceptInvite({
      token: req.body.token,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      password: req.body.password,
      timezone: req.body.timezone,
    });

    setAuthCookie(res, result.token);

    sendSuccessResponse(
      res,
      StatusCodes.CREATED,
      result,
      "Invite accepted. Account created and logged in."
    );
  } catch (error) {
    next(error);
  }
};

export { createInvite, acceptInvite };
