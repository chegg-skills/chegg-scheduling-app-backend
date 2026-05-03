import { prisma } from "../../shared/db/prisma";
import { logger } from "../../shared/logging/logger";
import {
  publishNotificationSafely,
  resolveFrontendUrl,
} from "../../shared/notifications/notification.publisher";
import { getTeamNotificationConfig } from "../../shared/notifications/notificationConfig";

import { formatNotificationDate } from "../../shared/utils/date";

type AvailabilityExceptionNotificationInput = {
  userId: string;
  date: Date | string;
  isUnavailable: boolean;
  startTime?: string | null;
  endTime?: string | null;
};

const queueAvailabilityExceptionNotification = async (
  input: AvailabilityExceptionNotificationInput,
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, firstName: true, lastName: true },
    });

    if (!user) return;

    const dateStr = formatNotificationDate(new Date(input.date));

    const timeStr = input.isUnavailable ? "Whole Day" : `${input.startTime} - ${input.endTime}`;

    const userName = `${user.firstName} ${user.lastName}`.trim();
    const frontendUrl = resolveFrontendUrl();

    // 1. Notify the User themselves
    await publishNotificationSafely({
      type: "AVAILABILITY_EXCEPTION_CREATED",
      recipients: user.email,
      userId: input.userId,
      variables: {
        userName,
        date: dateStr,
        timeRange: timeStr,
        frontendUrl,
        isSelfNotification: true,
      },
    });

    // 2. Notify Team Leads
    const teams = await prisma.team.findMany({
      where: {
        members: { some: { userId: input.userId, isActive: true } },
        isActive: true,
      },
      select: {
        id: true,
        teamLead: {
          select: { email: true, id: true },
        },
      },
    });

    for (const team of teams) {
      const config = await getTeamNotificationConfig(team.id);
      if (!config.notifyLeadOnAvailability) continue;
      if (!team.teamLead?.email) continue;

      await publishNotificationSafely({
        type: "AVAILABILITY_EXCEPTION_CREATED",
        recipients: team.teamLead.email,
        userId: input.userId, // Action performed by user
        variables: {
          userName,
          date: dateStr,
          timeRange: timeStr,
          frontendUrl,
          isSelfNotification: false,
        },
      });
    }
  } catch (error) {
    logger.error("Failed to queue availability exception notification.", {
      userId: input.userId,
      date: input.date,
      error,
    });
  }
};

export { queueAvailabilityExceptionNotification };
