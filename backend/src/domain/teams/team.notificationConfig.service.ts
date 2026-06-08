import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { UserRole } from "@prisma/client";
import type { CallerContext } from "../../shared/utils/userUtils";
import { DEFAULT_NOTIFICATION_CONFIG } from "../../shared/notifications/notificationConfig";

/**
 * Ensures the caller has administrative access to the team.
 * SUPER_ADMIN has access to everything.
 * TEAM_ADMIN must be an active member of the team.
 */
const ensureTeamAccess = async (teamId: string, caller: CallerContext) => {
  if (caller.role === UserRole.SUPER_ADMIN) return;

  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId: caller.id,
      },
    },
  });

  if (!membership || !membership.isActive) {
    throw new ErrorHandler(
      StatusCodes.FORBIDDEN,
      "You do not have administrative access to this team's configuration.",
    );
  }
};

export const getNotificationConfig = async (teamId: string, caller: CallerContext) => {
  await ensureTeamAccess(teamId, caller);

  const config = await prisma.teamNotificationConfig.findUnique({
    where: { teamId },
  });

  return config || { ...DEFAULT_NOTIFICATION_CONFIG, teamId };
};

export const upsertNotificationConfig = async (
  teamId: string,
  data: {
    reminderOffsets: number[];
    adminNotifyOnBooking: boolean;
    adminNotifyOnCancellation: boolean;
    adminNotifyOnNoShow: boolean;
    coachNotifyOnBooking: boolean;
    coachNotifyOnCancellation: boolean;
    coachNotifyOnNoShow: boolean;
    notifyLeadOnAvailability: boolean;
    sendFeedbackLink: boolean;
    feedbackFormLink?: string | null;
  },
  caller: CallerContext,
) => {
  await ensureTeamAccess(teamId, caller);

  return prisma.teamNotificationConfig.upsert({
    where: { teamId },
    update: data,
    create: {
      ...data,
      teamId,
    },
  });
};
