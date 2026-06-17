import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { UserRole } from "@prisma/client";
import * as inviteService from "./invite.service";
import { ListInvitesSchema } from "./invite.schema";
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
const createInvite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const adminId = res.locals.authUser?.id as string;
    const callerRole = res.locals.authUser?.role as UserRole;

    const result = await inviteService.createInvite({
      email: req.body.email,
      role: req.body.role,
      requiresSso: req.body.requiresSso,
      createdByAdminId: adminId,
      callerRole,
    });

    void queueInviteCreatedNotification({
      email: result.email,
      role: result.role,
      token: result.token,
      expiresAt: result.expiresAt,
      createdByAdminId: adminId,
      requiresSso: result.requiresSso,
    });

    sendSuccessResponse(
      res,
      StatusCodes.CREATED,
      {
        id: result.id,
        email: result.email,
        role: result.role,
        token: process.env.NODE_ENV !== "production" ? result.token : undefined,
        expiresAt: result.expiresAt,
        createdAt: result.createdAt,
      },
      "Invite sent successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const acceptInvite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await inviteService.acceptInvite(req.body);

    const csrfToken = setAuthCookie(res, result.token);

    void queueInviteAcceptedNotification({
      invitedById: result.invitedById,
      inviteeName: `${result.user.firstName} ${result.user.lastName}`.trim(),
      inviteeEmail: result.user.email,
      role: result.user.role,
    });

    sendSuccessResponse(
      res,
      StatusCodes.CREATED,
      { user: result.user, token: result.token, csrfToken },
      "Invite accepted. Account created and logged in.",
    );
  } catch (error) {
    next(error);
  }
};

const validateInvite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await inviteService.validateInvite(req.body.token as string);
    sendSuccessResponse(res, StatusCodes.OK, result, "Invite validation result.");
  } catch (error) {
    next(error);
  }
};

const listInvites = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const callerId = res.locals.authUser?.id as string;
    const callerRole = res.locals.authUser?.role as UserRole;
    const query = ListInvitesSchema.query.parse(req.query);

    const result = await inviteService.listInvites(query, callerId, callerRole);
    sendSuccessResponse(res, StatusCodes.OK, result, "Invites retrieved successfully.");
  } catch (error) {
    next(error);
  }
};

const revokeInvite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const callerId = res.locals.authUser?.id as string;
    const callerRole = res.locals.authUser?.role as UserRole;
    const { id } = req.params as { id: string };

    const result = await inviteService.revokeInvite(id, callerId, callerRole);
    sendSuccessResponse(res, StatusCodes.OK, result, "Invite revoked successfully.");
  } catch (error) {
    next(error);
  }
};

export { createInvite, acceptInvite, validateInvite, listInvites, revokeInvite };
