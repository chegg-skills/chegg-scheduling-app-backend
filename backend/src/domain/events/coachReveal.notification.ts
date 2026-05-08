import type { EventScheduleSlot } from "@prisma/client";
import { logger } from "../../shared/logging/logger";
import {
  publishNotificationSafely,
  resolveFrontendUrl,
} from "../../shared/notifications/notification.publisher";
import { formatNotificationDate } from "../../shared/utils/date";

type RevealParticipant = {
  studentEmail: string;
  studentName: string;
  timezone: string | null;
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
  joinUrl: string;
};

const queueCoachRevealNotifications = async (input: QueueCoachRevealNotificationsInput) => {
  try {
    const { slot, event, coach, participants, joinUrl } = input;
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
            timezone: p.timezone || "UTC",
            meetingJoinUrl: joinUrl,
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
          timezone: coach.timezone,
          meetingJoinUrl: joinUrl,
          frontendUrl,
        },
      }),
    );

    await Promise.all(publishTasks);
  } catch (error) {
    logger.error("Failed to queue coach reveal notifications.", {
      slotId: input.slot.id,
      error,
    });
  }
};

export { queueCoachRevealNotifications };
