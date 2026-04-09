import { prisma } from "../../shared/db/prisma";
import {
    publishNotificationSafely,
    resolveFrontendUrl,
} from "../../shared/notifications/notification.publisher";

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

        const timeStr = input.isUnavailable
            ? "Whole Day"
            : `${input.startTime} - ${input.endTime}`;

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
        const teamLeads = await prisma.team.findMany({
            where: {
                members: { some: { userId: input.userId, isActive: true } },
                isActive: true,
            },
            select: {
                teamLead: {
                    select: { email: true, id: true },
                },
            },
        });

        const leadEmails = Array.from(
            new Set(teamLeads.map((t) => t.teamLead?.email).filter((e): e is string => Boolean(e)))
        );

        if (leadEmails.length > 0) {
            await publishNotificationSafely({
                type: "AVAILABILITY_EXCEPTION_CREATED",
                recipients: leadEmails,
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
        console.error("Failed to queue availability exception notification:", error);
    }
};

export { queueAvailabilityExceptionNotification };
