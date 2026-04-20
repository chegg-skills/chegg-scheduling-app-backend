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
  const coachName = [booking.coach?.firstName, booking.coach?.lastName]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .trim();

  return coachName || "your coach";
};

const getBookingNotificationVariables = async (
  booking: SafeBooking,
  timezoneOverride?: string | null,
) => {
  const displayTimezone = timezoneOverride || booking.timezone || "UTC";

  const variables: any = {
    bookingId: booking.id,
    studentName: booking.studentName,
    studentEmail: booking.studentEmail,
    eventName: booking.event?.name ?? "your session",
    teamName: booking.team?.name ?? "your team",
    coachName: getCoachName(booking),
    startTime: formatNotificationDate(new Date(booking.startTime), displayTimezone),
    endTime: formatNotificationDate(new Date(booking.endTime), displayTimezone),
    timezone: displayTimezone,
    meetingJoinUrl: booking.meetingJoinUrl ?? "",
    bookingStatus: booking.status,
    frontendUrl: resolveFrontendUrl(),
    publicBookingUrl: booking.event?.publicBookingSlug
      ? `${resolveFrontendUrl()}/book/${booking.event.publicBookingSlug}`
      : resolveFrontendUrl(),
    rescheduleUrl: `${resolveFrontendUrl()}/reschedule/${booking.id}?token=${(booking as any).rescheduleToken ?? ""}`,
    coCoachDetails: "",
    coCoachNames: "",
  };

  if (booking.coCoachUserIds && booking.coCoachUserIds.length > 0) {
    const coHosts = await prisma.user.findMany({
      where: { id: { in: booking.coCoachUserIds }, isActive: true },
      select: { firstName: true, lastName: true },
    });

    if (coHosts.length > 0) {
      const names = coHosts.map((u) => `${u.firstName} ${u.lastName}`.trim()).join(", ");
      variables.coCoachNames = names;
      variables.coCoachDetails = `\nCo-coaches: ${names}`;
      variables.coCoachDetailsHtml = `<br/><strong>Co-coaches:</strong> ${names}`;
    }
  }

  return variables;
};

const getTeamAdminRecipients = async (
  teamId: string,
): Promise<{ email: string; timezone: string }[]> => {
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
          timezone: true,
        },
      },
    },
  });

  const uniqueAdmins = new Map<string, string>();
  members.forEach((member: any) => {
    if (member.user.email) {
      uniqueAdmins.set(member.user.email, member.user.timezone);
    }
  });

  return Array.from(uniqueAdmins.entries()).map(([email, timezone]) => ({ email, timezone }));
};

const buildReminderSendAt = (startTime: Date, hoursBefore: number): string | null => {
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
    userId: booking.coachUserId,
    variables: await getBookingNotificationVariables(booking, booking.timezone),
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

const queueBookingReminderNotifications = async (booking: SafeBooking): Promise<void> => {
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

const cancelScheduledBookingReminders = async (booking: SafeBooking): Promise<void> => {
  try {
    await publishNotificationSafely({
      type: "CANCEL_BOOKING_REMINDERS",
      recipients: booking.studentEmail,
      userId: booking.coachUserId,
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
    const studentVariables = await getBookingNotificationVariables(booking, booking.timezone);
    const coachVariables = await getBookingNotificationVariables(
      booking,
      booking.coach?.timezone || "UTC",
    );

    const publishTasks: Array<Promise<boolean>> = [
      publishNotificationSafely({
        type: "BOOKING_CONFIRMED",
        recipients: booking.studentEmail,
        userId: booking.coachUserId,
        variables: studentVariables,
      }),
    ];

    if (booking.coach?.email) {
      publishTasks.push(
        publishNotificationSafely({
          type: "COACH_BOOKING_ASSIGNED",
          recipients: booking.coach.email,
          userId: booking.coach.id,
          variables: coachVariables,
        }),
      );
    }

    const teamAdmins = await getTeamAdminRecipients(booking.teamId);
    for (const admin of teamAdmins) {
      publishTasks.push(
        publishNotificationSafely({
          type: "TEAM_BOOKING_CONFIRMED",
          recipients: admin.email,
          userId: booking.coachUserId,
          variables: await getBookingNotificationVariables(booking, admin.timezone),
        }),
      );
    }

    if (booking.coCoachUserIds && booking.coCoachUserIds.length > 0) {
      const coHosts = await prisma.user.findMany({
        where: { id: { in: booking.coCoachUserIds }, isActive: true },
        select: { id: true, email: true, timezone: true },
      });

      for (const coHost of coHosts) {
        if (coHost.email) {
          publishTasks.push(
            publishNotificationSafely({
              type: "COACH_BOOKING_COCOACH_ASSIGNED",
              recipients: coHost.email,
              userId: coHost.id,
              variables: await getBookingNotificationVariables(booking, coHost.timezone),
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
    const studentVariables = await getBookingNotificationVariables(booking, booking.timezone);
    const coachVariables = await getBookingNotificationVariables(
      booking,
      booking.coach?.timezone || "UTC",
    );
    const teamAdmins = await getTeamAdminRecipients(booking.teamId);

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.NO_SHOW) {
      await cancelScheduledBookingReminders(booking);
    }

    // Fetch co-hosts if needed
    const coCoachUserIds = (booking as any).coCoachUserIds as string[] | undefined;
    const coHostUsers = coCoachUserIds?.length
      ? await prisma.user.findMany({
        where: { id: { in: coCoachUserIds }, isActive: true },
        select: { id: true, email: true, timezone: true },
      })
      : [];

    if (booking.status === BookingStatus.CANCELLED) {
      const publishTasks: Array<Promise<boolean>> = [
        publishNotificationSafely({
          type: "BOOKING_CANCELLED",
          recipients: booking.studentEmail,
          userId: booking.coachUserId,
          variables: studentVariables,
        }),
      ];

      if (booking.coach?.email) {
        publishTasks.push(
          publishNotificationSafely({
            type: "COACH_BOOKING_CANCELLED",
            recipients: booking.coach.email,
            userId: booking.coach.id,
            variables: coachVariables,
          }),
        );
      }

      for (const coHost of coHostUsers) {
        if (coHost.email) {
          publishTasks.push(
            publishNotificationSafely({
              type: "COACH_BOOKING_COCOACH_CANCELLED",
              recipients: coHost.email,
              userId: coHost.id,
              variables: await getBookingNotificationVariables(booking, (coHost as any).timezone),
            }),
          );
        }
      }

      for (const admin of teamAdmins) {
        publishTasks.push(
          publishNotificationSafely({
            type: "TEAM_BOOKING_CANCELLED",
            recipients: admin.email,
            userId: booking.coachUserId,
            variables: await getBookingNotificationVariables(booking, admin.timezone),
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
          userId: booking.coachUserId,
          variables: studentVariables,
        }),
      ];

      if (booking.coach?.email) {
        publishTasks.push(
          publishNotificationSafely({
            type: "COACH_BOOKING_NO_SHOW",
            recipients: booking.coach.email,
            userId: booking.coach.id,
            variables: coachVariables,
          }),
        );
      }

      for (const coHost of coHostUsers) {
        if (coHost.email) {
          publishTasks.push(
            publishNotificationSafely({
              type: "COACH_BOOKING_COCOACH_NO_SHOW",
              recipients: coHost.email,
              userId: coHost.id,
              variables: await getBookingNotificationVariables(booking, (coHost as any).timezone),
            }),
          );
        }
      }

      for (const admin of teamAdmins) {
        publishTasks.push(
          publishNotificationSafely({
            type: "TEAM_BOOKING_NO_SHOW",
            recipients: admin.email,
            userId: booking.coachUserId,
            variables: await getBookingNotificationVariables(booking, admin.timezone),
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
    const publishTasks: Array<Promise<boolean>> = [];

    // Notify newly added co-coaches
    const oldCoCoaches = new Set(oldBooking.coCoachUserIds || []);
    const newCoCoaches = newBooking.coCoachUserIds || [];
    const addedCoCoaches = newCoCoaches.filter((id) => !oldCoCoaches.has(id));

    if (addedCoCoaches.length > 0) {
      const coCoachUsers = await prisma.user.findMany({
        where: { id: { in: addedCoCoaches }, isActive: true },
        select: { id: true, email: true, timezone: true },
      });

      for (const coCoach of coCoachUsers) {
        if (coCoach.email) {
          publishTasks.push(
            publishNotificationSafely({
              type: "COACH_BOOKING_COCOACH_ASSIGNED",
              recipients: coCoach.email,
              userId: coCoach.id,
              variables: await getBookingNotificationVariables(newBooking, coCoach.timezone),
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
    const studentVariables = await getBookingNotificationVariables(booking, booking.timezone);
    const coachVariables = await getBookingNotificationVariables(
      booking,
      booking.coach?.timezone || "UTC",
    );

    const publishTasks: Array<Promise<boolean>> = [
      publishNotificationSafely({
        type: "BOOKING_RESCHEDULED",
        recipients: booking.studentEmail,
        userId: booking.coachUserId,
        variables: studentVariables,
      }),
    ];

    if (booking.coach?.email) {
      publishTasks.push(
        publishNotificationSafely({
          type: "BOOKING_RESCHEDULED",
          recipients: booking.coach.email,
          userId: booking.coach.id,
          variables: coachVariables,
        }),
      );
    }

    // Also notify co-hosts
    if (booking.coCoachUserIds && booking.coCoachUserIds.length > 0) {
      const coHosts = await prisma.user.findMany({
        where: { id: { in: booking.coCoachUserIds }, isActive: true },
        select: { id: true, email: true, timezone: true },
      });

      for (const coHost of coHosts) {
        if (coHost.email) {
          publishTasks.push(
            publishNotificationSafely({
              type: "BOOKING_RESCHEDULED",
              recipients: coHost.email,
              userId: coHost.id,
              variables: await getBookingNotificationVariables(booking, coHost.timezone),
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
