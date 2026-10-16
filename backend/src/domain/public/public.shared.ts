import { Prisma } from "@prisma/client";

export const publicTeamSelect = {
  id: true,
  name: true,
  description: true,
  publicBookingSlug: true,
  isActive: true,
} as const;

export const publicEventSelect = {
  id: true,
  name: true,
  description: true,
  durationSeconds: true,
  bookingMode: true,
  locationType: true,
  publicBookingSlug: true,
  showDescription: true,
  teamId: true,
  minimumNoticeMinutes: true,
  maxParticipantCount: true,
  maxBookingWindowDays: true,
  interactionType: true,
  assignmentStrategy: true,
  allowStudentCoachChoice: true,
  customQuestions: true,
  useDefaultQuestions: true,
  coaches: {
    where: { isActive: true },
    orderBy: { coachOrder: "asc" as const },
    select: {
      coachUserId: true,
      coachOrder: true,
      coachUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
    },
  },
  team: {
    select: publicTeamSelect,
  },
} as const;

export const publicCoachSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  timezone: true,
  publicBookingSlug: true,
} as const;

export const publicGroupSelect = {
  id: true,
  name: true,
  description: true,
  color: true,
  publicBookingSlug: true,
  teamId: true,
  team: {
    select: publicTeamSelect,
  },
} as const;

export const publicDirectoryInclude = Prisma.validator<Prisma.BookingDirectoryInclude>()({
  sections: {
    orderBy: { sortOrder: "asc" },
    include: {
      eventType: true,
      teams: {
        orderBy: { sortOrder: "asc" },
        include: { team: { select: publicTeamSelect } },
      },
    },
  },
});

export const joinBookingSelect = {
  status: true,
  endTime: true,
  coach: { select: { zoomIsvLink: true } },
  scheduleSlot: {
    select: {
      isCancelled: true,
      sessionJoinUrl: true,
      assignedCoach: { select: { zoomIsvLink: true } },
    },
  },
  event: { select: { meetingLinkSource: true, locationValue: true } },
} satisfies Prisma.BookingSelect;

export type PublicTeam = Prisma.TeamGetPayload<{ select: typeof publicTeamSelect }>;
export type PublicEvent = Prisma.EventGetPayload<{ select: typeof publicEventSelect }>;
export type PublicEventWithState = Prisma.EventGetPayload<{
  select: typeof publicEventSelect & { isActive: true };
}>;
export type PublicEventWithType = Prisma.EventGetPayload<{
  select: typeof publicEventSelect & { eventTypeId: true };
}>;
export type PublicCoachRecord = Prisma.UserGetPayload<{
  select: typeof publicCoachSelect & { role: true; isActive: true };
}>;
export type PublicGroup = Prisma.EventGroupGetPayload<{ select: typeof publicGroupSelect }>;
export type PublicDirectoryRecord = Prisma.BookingDirectoryGetPayload<{
  include: typeof publicDirectoryInclude;
}>;
export type JoinBookingRecord = Prisma.BookingGetPayload<{ select: typeof joinBookingSelect }>;
