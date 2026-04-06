import { BookingStatus, UserRole } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import {
  publishNotificationSafely,
  resolveFrontendUrl,
  type NotificationType,
} from "../../shared/notifications/notification.publisher";
import type { SafeBooking } from "./booking.service";

const getCoachName = (booking: SafeBooking): string => {
  const coachName = [booking.host?.firstName, booking.host?.lastName]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .trim();

  return coachName || "your coach";
};

const getBookingNotificationVariables = (booking: SafeBooking) => ({
  bookingId: booking.id,
  studentName: booking.studentName,
  studentEmail: booking.studentEmail,
  eventName: booking.event?.name ?? "your session",
  teamName: booking.team?.name ?? "your team",
  coachName: getCoachName(booking),
  startTime: new Date(booking.startTime).toISOString(),
  endTime: new Date(booking.endTime).toISOString(),
  timezone: booking.timezone,
  meetingJoinUrl: booking.meetingJoinUrl ?? "",
  bookingStatus: booking.status,
  frontendUrl: resolveFrontendUrl(),
});

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
    variables: getBookingNotificationVariables(booking),
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
    console.error("Failed to queue booking reminders:", error);
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
    console.error("Failed to cancel scheduled booking reminders:", error);
  }
};

const queueBookingCreatedNotifications = async (booking: SafeBooking) => {
  try {
    const variables = getBookingNotificationVariables(booking);
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

    await Promise.all(publishTasks);
    await queueBookingReminderNotifications(booking);
  } catch (error) {
    console.error("Failed to queue booking creation notifications:", error);
  }
};

const queueBookingStatusNotifications = async (booking: SafeBooking) => {
  try {
    const variables = getBookingNotificationVariables(booking);
    const teamAdminRecipients = await getTeamAdminRecipients(booking.teamId);

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.NO_SHOW
    ) {
      await cancelScheduledBookingReminders(booking);
    }

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
            type: "BOOKING_CANCELLED",
            recipients: booking.host.email,
            userId: booking.host.id,
            variables,
          }),
        );
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
      const publishTasks: Array<Promise<boolean>> = [];

      if (booking.host?.email) {
        publishTasks.push(
          publishNotificationSafely({
            type: "BOOKING_NO_SHOW",
            recipients: booking.host.email,
            userId: booking.host.id,
            variables,
          }),
        );
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
    console.error("Failed to queue booking status notifications:", error);
  }
};

export { queueBookingCreatedNotifications, queueBookingStatusNotifications };
