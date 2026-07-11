import type { EventScheduleSlot } from "@prisma/client";
import { logger } from "../../shared/logging/logger";
import {
  publishNotificationSafely,
  resolveFrontendUrl,
} from "../../shared/notifications/notification.publisher";
import { formatNotificationDate, getFriendlyTimezoneLabel } from "../../shared/utils/date";

type RevealParticipant = {
  studentEmail: string;
  studentName: string;
  timezone: string | null;
  meetingJoinUrl: string | null;
};

type CoachInfo = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  timezone: string;
};

type EventInfo = {
  name: string;
  locationValue: string;
};

type QueueCoachRevealNotificationsInput = {
  slot: EventScheduleSlot;
  event: EventInfo;
  coach: CoachInfo;
  participants: RevealParticipant[];
  /** The coach's own real destination link — safe for the coach's own notification
   * (they're the host), never for a student-facing one. Named explicitly so it can't
   * be mistaken for something safe to forward to students. */
  coachRawJoinUrl: string;
};

const queueCoachRevealNotifications = async (input: QueueCoachRevealNotificationsInput) => {
  try {
    const { slot, event, coach, participants, coachRawJoinUrl } = input;
    const frontendUrl = resolveFrontendUrl();
    const coachName = `${coach.firstName} ${coach.lastName}`.trim();
    const coachTime = formatNotificationDate(new Date(slot.startTime), coach.timezone);

    const publishTasks: Array<Promise<boolean>> = [];

    for (const p of participants) {
      const studentTime = formatNotificationDate(new Date(slot.startTime), p.timezone || "UTC");
      publishTasks.push(
        publishNotificationSafely({
          type: "COACH_REVEAL_SENT",
          recipients: p.studentEmail,
          variables: {
            studentName: p.studentName,
            eventName: event.name,
            coachName,
            startTime: studentTime,
            timezone: getFriendlyTimezoneLabel(p.timezone || "UTC"),
            // Each booking's own masked redirect (/api/public/bookings/:id/join) — never the
            // coach's raw zoomIsvLink. The raw link is only appropriate in the coach's own
            // notification below, not one sent to students.
            meetingJoinUrl: p.meetingJoinUrl ?? "",
            frontendUrl,
          },
        }),
      );
    }

    publishTasks.push(
      publishNotificationSafely({
        type: "COACH_BOOKING_ASSIGNED",
        recipients: coach.email,
        userId: coach.id,
        variables: {
          coachName,
          eventName: event.name,
          studentName: `${participants.length} participant(s)`,
          startTime: coachTime,
          timezone: getFriendlyTimezoneLabel(coach.timezone),
          // The coach's own notification correctly uses the raw resolved link — they are the
          // meeting host, not a party the link needs to be masked from.
          meetingJoinUrl: coachRawJoinUrl,
          frontendUrl,
        },
      }),
    );

    await Promise.all(publishTasks);
  } catch (error) {
    logger.error({ slotId: input.slot.id, error }, "Failed to queue coach reveal notifications.");
  }
};

export { queueCoachRevealNotifications };
