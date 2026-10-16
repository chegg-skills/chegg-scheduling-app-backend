import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { UserRole } from "@prisma/client";
import type { CallerContext } from "../../shared/utils/userUtils";
import { DEFAULT_NOTIFICATION_CONFIG } from "../../shared/notifications/notificationConfig";
import type { TeamNotificationConfigRepository } from "./team.notificationConfig.repository";

export const createTeamNotificationConfigService = (
  configRepo: TeamNotificationConfigRepository,
) => {
  /**
   * Ensures the caller has administrative access to the team.
   * SUPER_ADMIN has access to everything.
   * TEAM_ADMIN must be an active member of the team.
   */
  const ensureTeamAccess = async (teamId: string, caller: CallerContext) => {
    if (caller.role === UserRole.SUPER_ADMIN) return;

    const membership = await configRepo.findMembership(teamId, caller.id);

    if (!membership || !membership.isActive) {
      throw new ErrorHandler(
        StatusCodes.FORBIDDEN,
        "You do not have administrative access to this team's configuration.",
      );
    }
  };

  const getNotificationConfig = async (teamId: string, caller: CallerContext) => {
    await ensureTeamAccess(teamId, caller);

    const config = await configRepo.findConfig(teamId);

    return config || { ...DEFAULT_NOTIFICATION_CONFIG, teamId };
  };

  const upsertNotificationConfig = async (
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

    return configRepo.upsertConfig(teamId, data);
  };

  return { getNotificationConfig, upsertNotificationConfig };
};

export type TeamNotificationConfigService = ReturnType<typeof createTeamNotificationConfigService>;
