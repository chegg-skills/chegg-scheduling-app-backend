import { prisma } from "../../shared/db/prisma";
import { UserRole } from "@prisma/client";
import { logger } from "../../shared/logging/logger";
import {
  publishNotificationSafely,
  resolveFrontendUrl,
} from "../../shared/notifications/notification.publisher";

type InviteCreatedNotificationInput = {
  email: string;
  role: UserRole;
  token: string;
  expiresAt: Date;
  createdByAdminId: string;
};

type InviteAcceptedNotificationInput = {
  invitedById: string;
  inviteeName: string;
  inviteeEmail: string;
  role: UserRole;
};

const queueInviteCreatedNotification = async (
  input: InviteCreatedNotificationInput,
) => {
  try {
    const inviteUrl = `${resolveFrontendUrl()}/accept-invite?token=${encodeURIComponent(
      input.token,
    )}`;

    await publishNotificationSafely({
      type: "USER_INVITED",
      recipients: input.email,
      userId: input.createdByAdminId,
      variables: {
        role: input.role,
        inviteUrl,
        expiresAt: input.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error("Failed to queue invite created notification.", {
      email: input.email,
      createdByAdminId: input.createdByAdminId,
      error,
    });
  }
};

const queueInviteAcceptedNotification = async (
  input: InviteAcceptedNotificationInput,
) => {
  try {
    const inviter = await prisma.user.findUnique({
      where: { id: input.invitedById },
      select: { email: true },
    });

    if (!inviter?.email) {
      return;
    }

    await publishNotificationSafely({
      type: "INVITE_ACCEPTED",
      recipients: inviter.email,
      userId: input.invitedById,
      variables: {
        inviteeName: input.inviteeName,
        inviteeEmail: input.inviteeEmail,
        role: input.role,
      },
    });
  } catch (error) {
    logger.error("Failed to queue invite accepted notification.", {
      invitedById: input.invitedById,
      inviteeEmail: input.inviteeEmail,
      error,
    });
  }
};

export { queueInviteAcceptedNotification, queueInviteCreatedNotification };
