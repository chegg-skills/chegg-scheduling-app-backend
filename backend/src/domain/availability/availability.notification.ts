import { UserRole } from "@prisma/client";
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
  callerIsAdmin: boolean;
};

const buildVariables = (
  userName: string,
  dateStr: string,
  timeStr: string,
  frontendUrl: string,
) => ({ userName, date: dateStr, timeRange: timeStr, frontendUrl });

const notifyAdminRecipients = async (
  userId: string,
  variables: ReturnType<typeof buildVariables>,
  type: "AVAILABILITY_EXCEPTION_CREATED" | "AVAILABILITY_EXCEPTION_REMOVED",
) => {
  const teams = await prisma.team.findMany({
    where: {
      members: { some: { userId, isActive: true } },
      isActive: true,
    },
    select: { id: true },
  });

  const notifiedEmails = new Set<string>();

  for (const team of teams) {
    const config = await getTeamNotificationConfig(team.id);
    if (!config.notifyLeadOnAvailability) continue;

    const teamAdmins = await prisma.teamMember.findMany({
      where: {
        teamId: team.id,
        isActive: true,
        user: { isActive: true, role: UserRole.TEAM_ADMIN },
      },
      select: { user: { select: { email: true } } },
    });

    for (const member of teamAdmins) {
      if (!member.user.email || notifiedEmails.has(member.user.email)) continue;
      notifiedEmails.add(member.user.email);
      await publishNotificationSafely({
        type,
        recipients: member.user.email,
        userId,
        variables: { ...variables, isSelfNotification: false },
      });
    }
  }

  const superAdmins = await prisma.user.findMany({
    where: { role: UserRole.SUPER_ADMIN, isActive: true },
    select: { email: true },
  });

  for (const admin of superAdmins) {
    if (!admin.email || notifiedEmails.has(admin.email)) continue;
    notifiedEmails.add(admin.email);
    await publishNotificationSafely({
      type,
      recipients: admin.email,
      userId,
      variables: { ...variables, isSelfNotification: false },
    });
  }
};

const queueExceptionNotification = async (
  input: AvailabilityExceptionNotificationInput,
  type: "AVAILABILITY_EXCEPTION_CREATED" | "AVAILABILITY_EXCEPTION_REMOVED",
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
    const variables = buildVariables(userName, dateStr, timeStr, frontendUrl);

    await publishNotificationSafely({
      type,
      recipients: user.email,
      userId: input.userId,
      variables: { ...variables, isSelfNotification: true },
    });

    if (!input.callerIsAdmin) {
      await notifyAdminRecipients(input.userId, variables, type);
    }
  } catch (error) {
    logger.error({ userId: input.userId, date: input.date, type, error }, "Failed to queue availability exception notification.");
  }
};

const queueAvailabilityExceptionNotification = (input: AvailabilityExceptionNotificationInput) =>
  queueExceptionNotification(input, "AVAILABILITY_EXCEPTION_CREATED");

const queueAvailabilityExceptionRemovedNotification = (
  input: AvailabilityExceptionNotificationInput,
) => queueExceptionNotification(input, "AVAILABILITY_EXCEPTION_REMOVED");

export { queueAvailabilityExceptionNotification, queueAvailabilityExceptionRemovedNotification };
