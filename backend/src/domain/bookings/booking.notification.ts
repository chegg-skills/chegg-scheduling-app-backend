import { BookingStatus, UserRole } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import { logger } from "../../shared/logging/logger";
import {
  publishNotificationSafely,
  resolveFrontendUrl,
  type NotificationType,
} from "../../shared/notifications/notification.publisher";
import type { SafeBooking } from "./booking.service";
import { bookingInclude } from "./booking.shared";

import { formatNotificationDate, getFriendlyTimezoneLabel } from "../../shared/utils/date";
import { escapeHtml } from "../../shared/utils/htmlSanitizer";
import {
  getTeamNotificationConfig,
  type ResolvedNotificationConfig,
} from "../../shared/notifications/notificationConfig";
import { getSystemSettingByKey } from "../systemSettings/systemSetting.service";

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
    timezone: getFriendlyTimezoneLabel(displayTimezone),
    meetingJoinUrl: booking.meetingJoinUrl ?? "",
    bookingStatus: booking.status,
    frontendUrl: resolveFrontendUrl(),
    publicBookingUrl: booking.event?.publicBookingSlug
      ? `${resolveFrontendUrl()}/book/event/${booking.event.publicBookingSlug}`
      : resolveFrontendUrl(),
    rescheduleUrl: `${resolveFrontendUrl()}/reschedule/${booking.id}?token=${booking.rescheduleToken ?? ""}`,
    cancelUrl: `${resolveFrontendUrl()}/cancel/${booking.id}?token=${booking.rescheduleToken ?? ""}`,
    coCoachDetails: "",
    coCoachNames: "",
    cancellationReason: booking.cancellationReason ?? "",
    cancellationDetails: booking.cancellationReason
      ? `\nReason: ${booking.cancellationReason}`
      : "",
    cancellationDetailsHtml: booking.cancellationReason
      ? `<br/><strong>Reason:</strong> ${escapeHtml(booking.cancellationReason)}`
      : "",
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

/**
 * Resolve the active co-host users (id/email/timezone) for a set of co-coach user ids.
 * Single source of truth for the recipient lookup that several notification paths share.
 */
const resolveCoHostRecipients = async (userIds: string[] | null | undefined) => {
  if (!userIds || userIds.length === 0) return [];
  return prisma.user.findMany({
    where: { id: { in: userIds }, isActive: true },
    select: { id: true, email: true, timezone: true },
  });
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

const buildReminderSendAt = (startTime: Date, offsetMinutes: number): string | null => {
  const sendAt = new Date(startTime.getTime() - offsetMinutes * 60 * 1000);

  return sendAt.getTime() > Date.now() ? sendAt.toISOString() : null;
};

const OFFSET_TO_TYPE: Record<
  number,
  Extract<
    NotificationType,
    "SESSION_REMINDER_24H" | "SESSION_REMINDER_12H" | "SESSION_REMINDER_6H" | "SESSION_REMINDER_1H"
  >
> = {
  1440: "SESSION_REMINDER_24H",
  720: "SESSION_REMINDER_12H",
  360: "SESSION_REMINDER_6H",
  60: "SESSION_REMINDER_1H",
};

const OFFSET_TO_ANONYMOUS_TYPE: Record<
  number,
  Extract<
    NotificationType,
    | "SESSION_REMINDER_ANONYMOUS_24H"
    | "SESSION_REMINDER_ANONYMOUS_12H"
    | "SESSION_REMINDER_ANONYMOUS_6H"
    | "SESSION_REMINDER_ANONYMOUS_1H"
  >
> = {
  1440: "SESSION_REMINDER_ANONYMOUS_24H",
  720: "SESSION_REMINDER_ANONYMOUS_12H",
  360: "SESSION_REMINDER_ANONYMOUS_6H",
  60: "SESSION_REMINDER_ANONYMOUS_1H",
};

const queueStudentReminderByOffset = async (
  booking: SafeBooking,
  offsetMinutes: number,
  isAnonymous = false,
): Promise<boolean> => {
  const type = isAnonymous ? OFFSET_TO_ANONYMOUS_TYPE[offsetMinutes] : OFFSET_TO_TYPE[offsetMinutes];
  // Nothing to schedule (unknown offset or send time already passed) is success,
  // not a publish failure — returning false here would make the outbox worker
  // retry and eventually dead-letter a booking that actually delivered fine.
  if (!type) return true;

  const sendAt = buildReminderSendAt(new Date(booking.startTime), offsetMinutes);

  if (!sendAt) {
    return true;
  }

  return publishNotificationSafely({
    type,
    recipients: booking.studentEmail,
    userId: booking.coachUserId ?? undefined,
    variables: await getBookingNotificationVariables(booking, booking.timezone),
    sendAt,
    notificationKey: `booking:${booking.id}:${type}`,
    entityType: "BOOKING",
    entityId: booking.id,
    recipientRole: "STUDENT",
    metadata: {
      bookingId: booking.id,
      reminderOffsetMinutes: offsetMinutes,
    },
  });
};

const queueCoachPoolRemindersForSlot = async (
  slotId: string,
  eventId: string,
  slotStartTime: Date,
  config: ResolvedNotificationConfig,
): Promise<boolean> => {
  const results: boolean[] = [];

  // Cancel all existing pool reminders for this slot
  results.push(
    await publishNotificationSafely({
      type: "CANCEL_BOOKING_REMINDERS",
      recipients: "",
      entityType: "scheduleSlot",
      entityId: slotId,
      metadata: { slotId },
    }),
  );

  // Count active bookings remaining on this slot
  const activeCount = await prisma.booking.count({
    where: {
      scheduleSlotId: slotId,
      status: { not: "CANCELLED" },
    },
  });

  if (activeCount === 0 || config.poolReminderOffsets.length === 0) return results.every(Boolean);

  // Fetch the event coach pool
  const coaches = await prisma.eventCoach.findMany({
    where: { eventId, isActive: true },
    select: { coachUserId: true, coachUser: { select: { email: true, timezone: true } } },
  });

  for (const coach of coaches) {
    if (!coach.coachUser.email) continue;
    for (const offsetMinutes of config.poolReminderOffsets) {
      const sendAt = buildReminderSendAt(slotStartTime, offsetMinutes);
      if (!sendAt) continue;

      results.push(
        await publishNotificationSafely({
          type: "ANONYMOUS_BOOKING_POOL_REMINDER",
          recipients: coach.coachUser.email,
          userId: coach.coachUserId,
          variables: {
            confirmedCount: activeCount,
            startTime: formatNotificationDate(slotStartTime, coach.coachUser.timezone || "UTC"),
            timezone: getFriendlyTimezoneLabel(coach.coachUser.timezone || "UTC"),
          },
          sendAt,
          notificationKey: `slot:${slotId}:pool:${coach.coachUserId}:${offsetMinutes}`,
          entityType: "scheduleSlot",
          entityId: slotId,
          recipientRole: "COACH",
          metadata: { slotId, offsetMinutes, confirmedCount: activeCount },
        }),
      );
    }
  }

  return results.every(Boolean);
};

export const notifyPoolOfSlotCancellation = async (
  slotId: string,
  eventId: string,
  slotStartTime: Date,
): Promise<void> => {
  try {
    // Cancel any pending pool reminders — session is no longer happening
    await publishNotificationSafely({
      type: "CANCEL_BOOKING_REMINDERS",
      recipients: "",
      entityType: "scheduleSlot",
      entityId: slotId,
      metadata: { slotId },
    });

    const coaches = await prisma.eventCoach.findMany({
      where: { eventId, isActive: true },
      select: { coachUserId: true, coachUser: { select: { email: true, timezone: true } } },
    });

    const publishTasks = coaches
      .filter((c) => c.coachUser.email)
      .map((c) =>
        publishNotificationSafely({
          type: "ANONYMOUS_SLOT_CANCELLED_POOL",
          recipients: c.coachUser.email!,
          userId: c.coachUserId,
          variables: {
            startTime: formatNotificationDate(slotStartTime, c.coachUser.timezone || "UTC"),
            timezone: getFriendlyTimezoneLabel(c.coachUser.timezone || "UTC"),
          },
          entityType: "scheduleSlot",
          entityId: slotId,
          recipientRole: "COACH",
          metadata: { slotId },
        }),
      );

    await Promise.all(publishTasks);
  } catch (error) {
    logger.error({ slotId, eventId, error }, "Failed to notify pool of slot cancellation.");
  }
};

const queueBookingReminderNotifications = async (
  booking: SafeBooking,
  config: ResolvedNotificationConfig,
): Promise<boolean> => {
  if (config.reminderOffsets.length === 0) return true;

  try {
    const results = await Promise.all(
      config.reminderOffsets.map((offset) => queueStudentReminderByOffset(booking, offset)),
    );
    return results.every(Boolean);
  } catch (error) {
    logger.error({ bookingId: booking.id, error }, "Failed to queue booking reminders.");
    return false;
  }
};

const cancelScheduledBookingReminders = async (booking: SafeBooking): Promise<void> => {
  try {
    await publishNotificationSafely({
      type: "CANCEL_BOOKING_REMINDERS",
      recipients: booking.studentEmail,
      userId: booking.coachUserId ?? undefined,
      entityType: "BOOKING",
      entityId: booking.id,
      metadata: {
        bookingId: booking.id,
        bookingStatus: booking.status,
      },
    });
  } catch (error) {
    logger.error({ bookingId: booking.id, error }, "Failed to cancel scheduled booking reminders.");
  }
};

type BookingNotificationOpts = {
  slotRevealedAt?: Date | null;
};

/**
 * Publishes the confirmation/assignment emails for a freshly created booking.
 *
 * Returns `true` only when every publish (and reminder scheduling) succeeded.
 * The outbox worker uses this to decide whether to retry: a `false` keeps the
 * outbox row pending. Because retries re-publish, every payload carries a stable,
 * role-based `notificationKey` so the notification-service dedups already-sent
 * emails (no duplicates). Keys are role-based rather than type-based so a
 * deferred→revealed flip between attempts can't produce two student emails.
 */
const queueBookingCreatedNotifications = async (
  booking: SafeBooking,
  opts?: BookingNotificationOpts,
): Promise<boolean> => {
  const keyFor = (role: string, recipient: string) =>
    `booking:${booking.id}:created:${role}:${recipient}`;

  try {
    const studentVariables = await getBookingNotificationVariables(booking, booking.timezone);
    const config = await getTeamNotificationConfig(booking.teamId);
    const isAnonymous = booking.event?.allowAnonymousBooking === true;
    const isDeferredReveal = !isAnonymous && booking.event?.deferCoachReveal === true && !opts?.slotRevealedAt;

    if (isAnonymous) {
      // Anonymous booking: student gets confirmation without coach details.
      // No coach assignment email. Pool reminders are slot-level.
      const publishTasks: Array<Promise<boolean>> = [
        publishNotificationSafely({
          type: "BOOKING_CONFIRMED_ANONYMOUS",
          recipients: booking.studentEmail,
          notificationKey: keyFor("student", booking.studentEmail),
          variables: {
            studentName: studentVariables.studentName,
            eventName: studentVariables.eventName,
            teamName: studentVariables.teamName,
            startTime: studentVariables.startTime,
            timezone: studentVariables.timezone,
            meetingJoinUrl: studentVariables.meetingJoinUrl,
            frontendUrl: studentVariables.frontendUrl,
            rescheduleUrl: studentVariables.rescheduleUrl,
          },
        }),
      ];

      if (config.adminNotifyOnBooking) {
        const teamAdmins = await getTeamAdminRecipients(booking.teamId);
        for (const admin of teamAdmins) {
          publishTasks.push(
            publishNotificationSafely({
              type: "TEAM_BOOKING_CONFIRMED",
              recipients: admin.email,
              notificationKey: keyFor("admin", admin.email),
              variables: await getBookingNotificationVariables(booking, admin.timezone),
            }),
          );
        }
      }

      const confirmResults = await Promise.all(publishTasks);

      // Queue anonymous student reminders
      const reminderResults = await Promise.all(
        config.reminderOffsets.map((offset) =>
          queueStudentReminderByOffset(booking, offset, true),
        ),
      );

      // Refresh slot-level pool reminders with updated participant count
      let poolOk = true;
      if (booking.scheduleSlotId) {
        poolOk = await queueCoachPoolRemindersForSlot(
          booking.scheduleSlotId,
          booking.eventId,
          new Date(booking.startTime),
          config,
        );
      }
      return confirmResults.every(Boolean) && reminderResults.every(Boolean) && poolOk;
    }

    const coachVariables = await getBookingNotificationVariables(
      booking,
      booking.coach?.timezone || "UTC",
    );

    const publishTasks: Array<Promise<boolean>> = [
      publishNotificationSafely({
        type: isDeferredReveal ? "BOOKING_CONFIRMED_DEFERRED" : "BOOKING_CONFIRMED",
        recipients: booking.studentEmail,
        userId: booking.coachUserId ?? undefined,
        notificationKey: keyFor("student", booking.studentEmail),
        variables: isDeferredReveal
          ? {
              studentName: studentVariables.studentName,
              eventName: studentVariables.eventName,
              teamName: studentVariables.teamName,
              startTime: studentVariables.startTime,
              timezone: studentVariables.timezone,
              frontendUrl: studentVariables.frontendUrl,
              rescheduleUrl: studentVariables.rescheduleUrl,
            }
          : studentVariables,
      }),
    ];

    if (booking.coach?.email && config.coachNotifyOnBooking) {
      publishTasks.push(
        publishNotificationSafely({
          type: "COACH_BOOKING_ASSIGNED",
          recipients: booking.coach.email,
          userId: booking.coach.id,
          notificationKey: keyFor("coach", booking.coach.email),
          variables: coachVariables,
        }),
      );
    }

    if (config.adminNotifyOnBooking) {
      const teamAdmins = await getTeamAdminRecipients(booking.teamId);
      for (const admin of teamAdmins) {
        publishTasks.push(
          publishNotificationSafely({
            type: "TEAM_BOOKING_CONFIRMED",
            recipients: admin.email,
            userId: booking.coachUserId ?? undefined,
            notificationKey: keyFor("admin", admin.email),
            variables: await getBookingNotificationVariables(booking, admin.timezone),
          }),
        );
      }
    }

    if (booking.coCoachUserIds && booking.coCoachUserIds.length > 0) {
      const coHosts = await resolveCoHostRecipients(booking.coCoachUserIds);

      for (const coHost of coHosts) {
        if (coHost.email) {
          publishTasks.push(
            publishNotificationSafely({
              type: "COACH_BOOKING_COHOST_ASSIGNED",
              recipients: coHost.email,
              userId: coHost.id,
              notificationKey: keyFor("cocoach", coHost.email),
              variables: await getBookingNotificationVariables(booking, coHost.timezone),
            }),
          );
        }
      }
    }

    const confirmResults = await Promise.all(publishTasks);
    const remindersOk = isDeferredReveal
      ? true
      : await queueBookingReminderNotifications(booking, config);
    return confirmResults.every(Boolean) && remindersOk;
  } catch (error) {
    logger.error({ bookingId: booking.id, eventId: booking.eventId, error }, "Failed to queue booking creation notifications.");
    return false;
  }
};

const queueBookingStatusNotifications = async (
  booking: SafeBooking,
  opts?: BookingNotificationOpts,
) => {
  try {
    const studentVariables = await getBookingNotificationVariables(booking, booking.timezone);
    const coachVariables = await getBookingNotificationVariables(
      booking,
      booking.coach?.timezone || "UTC",
    );
    const config = await getTeamNotificationConfig(booking.teamId);

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.NO_SHOW) {
      await cancelScheduledBookingReminders(booking);
    }

    // Fetch co-hosts if needed
    const coCoachUserIds = (booking as any).coCoachUserIds as string[] | undefined;
    const coHostUsers = await resolveCoHostRecipients(coCoachUserIds);

    if (booking.status === BookingStatus.CANCELLED) {
      const isAnonymous = booking.event?.allowAnonymousBooking === true;

      let cancellationType: NotificationType;
      if (isAnonymous) {
        cancellationType = "BOOKING_CANCELLED_ANONYMOUS";
      } else if (booking.event?.deferCoachReveal && !opts?.slotRevealedAt) {
        cancellationType = "BOOKING_CANCELLED_DEFERRED";
      } else {
        cancellationType = "BOOKING_CANCELLED";
      }

      const publishTasks: Array<Promise<boolean>> = [
        publishNotificationSafely({
          type: cancellationType,
          recipients: booking.studentEmail,
          userId: booking.coachUserId ?? undefined,
          variables: studentVariables,
        }),
      ];

      if (!isAnonymous) {
        if (booking.coach?.email && config.coachNotifyOnCancellation) {
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
                type: "COACH_BOOKING_COHOST_CANCELLED",
                recipients: coHost.email,
                userId: coHost.id,
                variables: await getBookingNotificationVariables(booking, (coHost as any).timezone),
              }),
            );
          }
        }
      }

      if (config.adminNotifyOnCancellation) {
        const teamAdmins = await getTeamAdminRecipients(booking.teamId);
        for (const admin of teamAdmins) {
          publishTasks.push(
            publishNotificationSafely({
              type: "TEAM_BOOKING_CANCELLED",
              recipients: admin.email,
              userId: booking.coachUserId ?? undefined,
              variables: await getBookingNotificationVariables(booking, admin.timezone),
            }),
          );
        }
      }

      await Promise.all(publishTasks);

      // For anonymous slots: refresh pool reminders with updated participant count
      if (isAnonymous && booking.scheduleSlotId) {
        await queueCoachPoolRemindersForSlot(
          booking.scheduleSlotId,
          booking.eventId,
          new Date(booking.startTime),
          config,
        );
      }
    }

    if (booking.status === BookingStatus.NO_SHOW) {
      const publishTasks: Array<Promise<boolean>> = [
        publishNotificationSafely({
          type: "BOOKING_NO_SHOW",
          recipients: booking.studentEmail,
          userId: booking.coachUserId ?? undefined,
          variables: studentVariables,
        }),
      ];

      if (booking.coach?.email && config.coachNotifyOnNoShow) {
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
              type: "COACH_BOOKING_COHOST_NO_SHOW",
              recipients: coHost.email,
              userId: coHost.id,
              variables: await getBookingNotificationVariables(booking, (coHost as any).timezone),
            }),
          );
        }
      }

      if (config.adminNotifyOnNoShow) {
        const teamAdmins = await getTeamAdminRecipients(booking.teamId);
        for (const admin of teamAdmins) {
          publishTasks.push(
            publishNotificationSafely({
              type: "TEAM_BOOKING_NO_SHOW",
              recipients: admin.email,
              userId: booking.coachUserId ?? undefined,
              variables: await getBookingNotificationVariables(booking, admin.timezone),
            }),
          );
        }
      }

      await Promise.all(publishTasks);
    }
  } catch (error) {
    logger.error({ bookingId: booking.id, status: booking.status, error }, "Failed to queue booking status notifications.");
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
      const coCoachUsers = await resolveCoHostRecipients(addedCoCoaches);

      for (const coCoach of coCoachUsers) {
        if (coCoach.email) {
          publishTasks.push(
            publishNotificationSafely({
              type: "COACH_BOOKING_COHOST_ASSIGNED",
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
    logger.error({ bookingId: newBooking.id, error }, "Failed to queue booking update notifications.");
  }
};

const queueBookingRescheduledNotifications = async (booking: SafeBooking) => {
  try {
    const studentVariables = await getBookingNotificationVariables(booking, booking.timezone);
    const coachVariables = await getBookingNotificationVariables(
      booking,
      booking.coach?.timezone || "UTC",
    );

    const config = await getTeamNotificationConfig(booking.teamId);

    const publishTasks: Array<Promise<boolean>> = [
      publishNotificationSafely({
        type: "BOOKING_RESCHEDULED",
        recipients: booking.studentEmail,
        userId: booking.coachUserId ?? undefined,
        variables: studentVariables,
      }),
    ];

    if (booking.coach?.email && (config.coachNotifyOnBooking || config.coachNotifyOnCancellation)) {
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
      const coHosts = await resolveCoHostRecipients(booking.coCoachUserIds);

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
    await queueBookingReminderNotifications(booking, config);
  } catch (error) {
    logger.error({ bookingId: booking.id, eventId: booking.eventId, error }, "Failed to queue booking rescheduled notifications.");
  }
};

/**
 * Sends a post-session feedback email to the student when:
 * - The team has `sendFeedbackLink` enabled in their notification config, AND
 * - A feedback form link is available: the team-level `feedbackFormLink` takes priority,
 *   falling back to the global `feedbackFormLink` system setting if the team value is null.
 *
 * Call this after a booking transitions to COMPLETED (session logged as attended).
 * Treats an empty string link the same as absent — no email is sent.
 */
const queueStudentFeedbackNotification = async (booking: SafeBooking): Promise<void> => {
  try {
    const config = await getTeamNotificationConfig(booking.teamId);
    if (!config.sendFeedbackLink) return;

    const feedbackFormLink = config.feedbackFormLink ?? (await getSystemSettingByKey("feedbackFormLink"));
    if (!feedbackFormLink) return;

    await publishNotificationSafely({
      type: "STUDENT_SESSION_FEEDBACK",
      recipients: booking.studentEmail,
      userId: booking.coachUserId ?? undefined,
      variables: {
        ...(await getBookingNotificationVariables(booking, booking.timezone)),
        feedbackFormLink,
      },
      notificationKey: `booking:${booking.id}:STUDENT_SESSION_FEEDBACK`,
      entityType: "BOOKING",
      entityId: booking.id,
      recipientRole: "STUDENT",
    });
  } catch (error) {
    logger.error({ bookingId: booking.id, error }, "Failed to queue student feedback notification.");
  }
};

/**
 * Notifies all active booking holders and the assigned coach when a slot's
 * time or coach is changed by an admin. Respects anonymous and deferred-reveal modes.
 */
const queueSlotRescheduledNotifications = async (
  slotId: string,
  opts: {
    isAnonymous: boolean;
    coachRevealSentAt: Date | null;
    assignedCoach: { id: string; email: string; timezone: string | null } | null;
  },
): Promise<void> => {
  try {
    const { isAnonymous, assignedCoach } = opts;

    const bookings = await prisma.booking.findMany({
      where: { scheduleSlotId: slotId, status: { notIn: ["CANCELLED"] } },
      include: bookingInclude,
    });

    const publishTasks: Array<Promise<boolean>> = [];

    for (const booking of bookings) {
      const studentVars = await getBookingNotificationVariables(booking as SafeBooking, booking.timezone);

      if (isAnonymous) {
        publishTasks.push(
          publishNotificationSafely({
            type: "SLOT_RESCHEDULED_ANONYMOUS",
            recipients: booking.studentEmail,
            variables: {
              studentName: studentVars.studentName,
              eventName: studentVars.eventName,
              teamName: studentVars.teamName,
              startTime: studentVars.startTime,
              timezone: studentVars.timezone,
              meetingJoinUrl: studentVars.meetingJoinUrl,
            },
          }),
        );
      } else {
        publishTasks.push(
          publishNotificationSafely({
            type: "SLOT_RESCHEDULED",
            recipients: booking.studentEmail,
            variables: studentVars,
          }),
        );
      }
    }

    // Notify the assigned coach once (all bookings in a slot share the same time)
    if (!isAnonymous && assignedCoach?.email && bookings.length > 0) {
      const coachVars = await getBookingNotificationVariables(
        bookings[0] as SafeBooking,
        assignedCoach.timezone,
      );
      publishTasks.push(
        publishNotificationSafely({
          type: "SLOT_RESCHEDULED_COACH",
          recipients: assignedCoach.email,
          userId: assignedCoach.id,
          variables: coachVars,
        }),
      );
    }

    await Promise.all(publishTasks);

    // Cancel stale reminders and re-queue with the updated slot time for each booking.
    for (const booking of bookings) {
      try {
        const config = await getTeamNotificationConfig(booking.teamId);
        await cancelScheduledBookingReminders(booking as SafeBooking);
        await queueBookingReminderNotifications(booking as SafeBooking, config);
      } catch (error) {
        logger.error({ slotId, bookingId: booking.id, error }, "Failed to refresh reminders after slot reschedule.");
      }
    }
  } catch (error) {
    logger.error({ slotId, error }, "Failed to queue slot rescheduled notifications.");
  }
};

/**
 * Notifies all active booking holders and the newly assigned coach when only the
 * coach is changed on a slot (time unchanged). Also cancels stale reminders and
 * re-queues them with the updated coach and meeting link.
 */
const queueSlotCoachReassignedNotifications = async (
  slotId: string,
  opts: {
    isAnonymous: boolean;
    newCoach: { id: string; email: string; timezone: string | null } | null;
  },
): Promise<void> => {
  try {
    const { isAnonymous, newCoach } = opts;

    // Bookings have already been cascaded with the new coachUserId before this runs,
    // so bookingInclude will join the updated coach data.
    const bookings = await prisma.booking.findMany({
      where: { scheduleSlotId: slotId, status: { notIn: ["CANCELLED"] } },
      include: bookingInclude,
    });

    const publishTasks: Array<Promise<boolean>> = [];

    for (const booking of bookings) {
      // Anonymous events don't expose coach identity to students — skip student email.
      if (!isAnonymous) {
        const studentVars = await getBookingNotificationVariables(booking as SafeBooking, booking.timezone);
        publishTasks.push(
          publishNotificationSafely({
            type: "SLOT_COACH_REASSIGNED",
            recipients: booking.studentEmail,
            variables: studentVars,
          }),
        );
      }
    }

    // Notify the new coach once for the slot.
    if (newCoach?.email && bookings.length > 0) {
      const coachVars = await getBookingNotificationVariables(
        bookings[0] as SafeBooking,
        newCoach.timezone,
      );
      publishTasks.push(
        publishNotificationSafely({
          type: "SLOT_COACH_REASSIGNED_COACH",
          recipients: newCoach.email,
          userId: newCoach.id,
          variables: coachVars,
        }),
      );
    }

    await Promise.all(publishTasks);

    // Cancel stale reminders (baked with old coach name/link) and re-queue fresh.
    for (const booking of bookings) {
      try {
        const config = await getTeamNotificationConfig(booking.teamId);
        await cancelScheduledBookingReminders(booking as SafeBooking);
        await queueBookingReminderNotifications(booking as SafeBooking, config);
      } catch (error) {
        logger.error({ slotId, bookingId: booking.id, error }, "Failed to refresh reminders after coach reassignment.");
      }
    }
  } catch (error) {
    logger.error({ slotId, error }, "Failed to queue slot coach reassignment notifications.");
  }
};

export {
  queueBookingCreatedNotifications,
  queueBookingStatusNotifications,
  queueBookingUpdatedNotifications,
  queueBookingRescheduledNotifications,
  queueStudentFeedbackNotification,
  queueSlotRescheduledNotifications,
  queueSlotCoachReassignedNotifications,
};
