import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import * as inviteService from "./invite.service";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import { setAuthCookie } from "../../shared/utils/cookie";
import {
  queueInviteAcceptedNotification,
  queueInviteCreatedNotification,
} from "./invite.notification";

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

    void queueInviteCreatedNotification({
      email: result.email,
      role: result.role,
      token: result.token,
      expiresAt: result.expiresAt,
      createdByAdminId: adminId,
    });

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

    void queueInviteAcceptedNotification({
      invitedById: result.invitedById,
      inviteeName: `${result.user.firstName} ${result.user.lastName}`.trim(),
      inviteeEmail: result.user.email,
      role: result.user.role,
    });

    sendSuccessResponse(
      res,
      StatusCodes.CREATED,
      { user: result.user, token: result.token },
      "Invite accepted. Account created and logged in."
    );
  } catch (error) {
    next(error);
  }
};

export { createInvite, acceptInvite };
