import { BookingStatus, UserRole } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import { logger } from "../../shared/logging/logger";
import {
  publishNotificationSafely,
  resolveFrontendUrl,
  type NotificationType,
} from "../../shared/notifications/notification.publisher";
import type { SafeBooking } from "./booking.service";

import { formatNotificationDate } from "../../shared/utils/date";

const getCoachName = (booking: SafeBooking): string => {
  const coachName = [booking.host?.firstName, booking.host?.lastName]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .trim();

  return coachName || "your coach";
};

const getBookingNotificationVariables = async (booking: SafeBooking) => {
  const variables: any = {
    bookingId: booking.id,
    studentName: booking.studentName,
    studentEmail: booking.studentEmail,
    eventName: booking.event?.name ?? "your session",
    teamName: booking.team?.name ?? "your team",
    coachName: getCoachName(booking),
    startTime: formatNotificationDate(new Date(booking.startTime), booking.timezone),
    endTime: formatNotificationDate(new Date(booking.endTime), booking.timezone),
    timezone: booking.timezone,
    meetingJoinUrl: booking.meetingJoinUrl ?? "",
    bookingStatus: booking.status,
    frontendUrl: resolveFrontendUrl(),
    publicBookingUrl: booking.event?.publicBookingSlug
      ? `${resolveFrontendUrl()}/book/${booking.event.publicBookingSlug}`
      : resolveFrontendUrl(),
    rescheduleUrl: `${resolveFrontendUrl()}/reschedule/${booking.id}?token=${(booking as any).rescheduleToken ?? ""}`,
    coHostDetails: "",
    coHostNames: "",
  };

  if (booking.coHostUserIds && booking.coHostUserIds.length > 0) {
    const coHosts = await prisma.user.findMany({
      where: { id: { in: booking.coHostUserIds }, isActive: true },
      select: { firstName: true, lastName: true },
    });

    if (coHosts.length > 0) {
      const names = coHosts
        .map((u) => `${u.firstName} ${u.lastName}`.trim())
        .join(", ");
      variables.coHostNames = names;
      variables.coHostDetails = `\nCo-hosts: ${names}`;
      variables.coHostDetailsHtml = `<br/><strong>Co-hosts:</strong> ${names}`;
    }
  }

  return variables;
};

const getTeamAdminRecipients = async (teamId: string): Promise<string[]> => {
  const members = await prisma.teamMember.findMany({
    where: {
      teamId,
      isActive: true,
      user: {
        isActive: true,
        role: UserRole.TEAM_ADMIN,
      },
    },
    select: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  return Array.from(
    new Set(members.map((member: any) => member.user.email).filter(Boolean)),
  );
};

const buildReminderSendAt = (
  startTime: Date,
  hoursBefore: number,
): string | null => {
  const sendAt = new Date(startTime.getTime() - hoursBefore * 60 * 60 * 1000);

  return sendAt.getTime() > Date.now() ? sendAt.toISOString() : null;
};

const queueStudentReminder = async (
  booking: SafeBooking,
  type: Extract<NotificationType, "SESSION_REMINDER_24H" | "SESSION_REMINDER_1H">,
  hoursBefore: 24 | 1,
): Promise<boolean> => {
  const sendAt = buildReminderSendAt(new Date(booking.startTime), hoursBefore);

  if (!sendAt) {
    return false;
  }

  return publishNotificationSafely({
    type,
    recipients: booking.studentEmail,
    userId: booking.hostUserId,
    variables: await getBookingNotificationVariables(booking),
    sendAt,
    notificationKey: `booking:${booking.id}:${type}`,
    entityType: "BOOKING",
    entityId: booking.id,
    recipientRole: "STUDENT",
    metadata: {
      bookingId: booking.id,
      reminderOffsetHours: hoursBefore,
    },
  });
};

const queueBookingReminderNotifications = async (
  booking: SafeBooking,
): Promise<void> => {
  try {
    await Promise.all([
      queueStudentReminder(booking, "SESSION_REMINDER_24H", 24),
      queueStudentReminder(booking, "SESSION_REMINDER_1H", 1),
    ]);
  } catch (error) {
    logger.error("Failed to queue booking reminders.", {
      bookingId: booking.id,
      error,
    });
  }
};

const cancelScheduledBookingReminders = async (
  booking: SafeBooking,
): Promise<void> => {
  try {
    await publishNotificationSafely({
      type: "CANCEL_BOOKING_REMINDERS",
      recipients: booking.studentEmail,
      userId: booking.hostUserId,
      entityType: "BOOKING",
      entityId: booking.id,
      metadata: {
        bookingId: booking.id,
        bookingStatus: booking.status,
      },
    });
  } catch (error) {
    logger.error("Failed to cancel scheduled booking reminders.", {
      bookingId: booking.id,
      error,
    });
  }
};

const queueBookingCreatedNotifications = async (booking: SafeBooking) => {
  try {
    const variables = await getBookingNotificationVariables(booking);
    const publishTasks: Array<Promise<boolean>> = [
      publishNotificationSafely({
        type: "BOOKING_CONFIRMED",
        recipients: booking.studentEmail,
        userId: booking.hostUserId,
        variables,
      }),
    ];

    if (booking.host?.email) {
      publishTasks.push(
        publishNotificationSafely({
          type: "COACH_BOOKING_ASSIGNED",
          recipients: booking.host.email,
          userId: booking.host.id,
          variables,
        }),
      );
    }

    const teamAdminRecipients = await getTeamAdminRecipients(booking.teamId);
    if (teamAdminRecipients.length > 0) {
      publishTasks.push(
        publishNotificationSafely({
          type: "TEAM_BOOKING_CONFIRMED",
          recipients: teamAdminRecipients,
          userId: booking.hostUserId,
          variables,
        }),
      );
    }

    if (booking.coHostUserIds && booking.coHostUserIds.length > 0) {
      const coHosts = await prisma.user.findMany({
        where: { id: { in: booking.coHostUserIds }, isActive: true },
        select: { id: true, email: true },
      });

      for (const coHost of coHosts) {
        if (coHost.email) {
          publishTasks.push(
            publishNotificationSafely({
              type: "COACH_BOOKING_COHOST_ASSIGNED",
              recipients: coHost.email,
              userId: coHost.id,
              variables,
            }),
          );
        }
      }
    }

    await Promise.all(publishTasks);
    await queueBookingReminderNotifications(booking);
  } catch (error) {
    logger.error("Failed to queue booking creation notifications.", {
      bookingId: booking.id,
      eventId: booking.eventId,
      error,
    });
  }
};

const queueBookingStatusNotifications = async (booking: SafeBooking) => {
  try {
    const variables = await getBookingNotificationVariables(booking);
    const teamAdminRecipients = await getTeamAdminRecipients(booking.teamId);

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.NO_SHOW
    ) {
      await cancelScheduledBookingReminders(booking);
    }

    // Fetch co-hosts if needed
    const coHostUserIds = (booking as any).coHostUserIds as string[] | undefined;
    const coHostUsers = coHostUserIds?.length
      ? await prisma.user.findMany({
        where: { id: { in: coHostUserIds }, isActive: true },
        select: { id: true, email: true },
      })
      : [];

    if (booking.status === BookingStatus.CANCELLED) {
      const publishTasks: Array<Promise<boolean>> = [
        publishNotificationSafely({
          type: "BOOKING_CANCELLED",
          recipients: booking.studentEmail,
          userId: booking.hostUserId,
          variables,
        }),
      ];

      if (booking.host?.email) {
        publishTasks.push(
          publishNotificationSafely({
            type: "COACH_BOOKING_CANCELLED",
            recipients: booking.host.email,
            userId: booking.host.id,
            variables,
          }),
        );
      }

      for (const coHost of coHostUsers) {
        if (coHost.email) {
          publishTasks.push(
            publishNotificationSafely({
              type: "COACH_BOOKING_COHOST_CANCELLED",
              recipients: coHost.email,
              userId: coHost.id,
              variables,
            }),
          );
        }
      }

      if (teamAdminRecipients.length > 0) {
        publishTasks.push(
          publishNotificationSafely({
            type: "TEAM_BOOKING_CANCELLED",
            recipients: teamAdminRecipients,
            userId: booking.hostUserId,
            variables,
          }),
        );
      }

      await Promise.all(publishTasks);
    }

    if (booking.status === BookingStatus.NO_SHOW) {
      const publishTasks: Array<Promise<boolean>> = [
        publishNotificationSafely({
          type: "BOOKING_NO_SHOW",
          recipients: booking.studentEmail,
          userId: booking.hostUserId,
          variables,
        }),
      ];

      if (booking.host?.email) {
        publishTasks.push(
          publishNotificationSafely({
            type: "COACH_BOOKING_NO_SHOW",
            recipients: booking.host.email,
            userId: booking.host.id,
            variables,
          }),
        );
      }

      for (const coHost of coHostUsers) {
        if (coHost.email) {
          publishTasks.push(
            publishNotificationSafely({
              type: "COACH_BOOKING_COHOST_NO_SHOW",
              recipients: coHost.email,
              userId: coHost.id,
              variables,
            }),
          );
        }
      }

      if (teamAdminRecipients.length > 0) {
        publishTasks.push(
          publishNotificationSafely({
            type: "TEAM_BOOKING_NO_SHOW",
            recipients: teamAdminRecipients,
            userId: booking.hostUserId,
            variables,
          }),
        );
      }

      await Promise.all(publishTasks);
    }
  } catch (error) {
    logger.error("Failed to queue booking status notifications.", {
      bookingId: booking.id,
      status: booking.status,
      error,
    });
  }
};

const queueBookingUpdatedNotifications = async (
  oldBooking: SafeBooking,
  newBooking: SafeBooking,
) => {
  try {
    const variables = await getBookingNotificationVariables(newBooking);
    const publishTasks: Array<Promise<boolean>> = [];

    // Notify newly added co-hosts
    const oldCoHosts = new Set(oldBooking.coHostUserIds || []);
    const newCoHosts = newBooking.coHostUserIds || [];
    const addedCoHosts = newCoHosts.filter((id) => !oldCoHosts.has(id));

    if (addedCoHosts.length > 0) {
      const coHostUsers = await prisma.user.findMany({
        where: { id: { in: addedCoHosts }, isActive: true },
        select: { id: true, email: true },
      });

      for (const coHost of coHostUsers) {
        if (coHost.email) {
          publishTasks.push(
            publishNotificationSafely({
              type: "COACH_BOOKING_COHOST_ASSIGNED",
              recipients: coHost.email,
              userId: coHost.id,
              variables,
            }),
          );
        }
      }
    }

    // Handle status changes if they weren't already handled by separate status update call
    // Note: status changes normally go through queueBookingStatusNotifications
    // but if updateBooking changes status too, we should handle it here or ensure it's called.

    await Promise.all(publishTasks);
  } catch (error) {
    logger.error("Failed to queue booking update notifications.", {
      bookingId: newBooking.id,
      error,
    });
  }
};

const queueBookingRescheduledNotifications = async (booking: SafeBooking) => {
  try {
    const variables = await getBookingNotificationVariables(booking);
    const publishTasks: Array<Promise<boolean>> = [
      publishNotificationSafely({
        type: "BOOKING_RESCHEDULED",
        recipients: booking.studentEmail,
        userId: booking.hostUserId,
        variables,
      }),
    ];

    if (booking.host?.email) {
      publishTasks.push(
        publishNotificationSafely({
          type: "BOOKING_RESCHEDULED",
          recipients: booking.host.email,
          userId: booking.host.id,
          variables,
        }),
      );
    }

    // Also notify co-hosts
    if (booking.coHostUserIds && booking.coHostUserIds.length > 0) {
      const coHosts = await prisma.user.findMany({
        where: { id: { in: booking.coHostUserIds }, isActive: true },
        select: { id: true, email: true },
      });

      for (const coHost of coHosts) {
        if (coHost.email) {
          publishTasks.push(
            publishNotificationSafely({
              type: "BOOKING_RESCHEDULED",
              recipients: coHost.email,
              userId: coHost.id,
              variables,
            }),
          );
        }
      }
    }

    await Promise.all(publishTasks);

    // Rescheduling should also refresh the reminders!
    await cancelScheduledBookingReminders(booking);
    await queueBookingReminderNotifications(booking);
  } catch (error) {
    logger.error("Failed to queue booking rescheduled notifications.", {
      bookingId: booking.id,
      eventId: booking.eventId,
      error,
    });
  }
};

export {
  queueBookingCreatedNotifications,
  queueBookingStatusNotifications,
  queueBookingUpdatedNotifications,
  queueBookingRescheduledNotifications,
};
