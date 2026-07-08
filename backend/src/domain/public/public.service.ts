import { UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import {
  assertCancelTokenValid,
  assertRescheduleTokenValid,
  bookingInclude,
} from "../bookings/booking.shared";
import { getDefaultQuestionTexts } from "../systemSettings/bookingQuestion.service";

const slugSchema = z.string().trim().min(1, "Slug is required");

const publicTeamSelect = {
  id: true,
  name: true,
  description: true,
  publicBookingSlug: true,
  isActive: true,
} as const;

const publicEventSelect = {
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

const publicCoachSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  timezone: true,
  publicBookingSlug: true,
} as const;

const publicGroupSelect = {
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

const normalizeSlug = (slug: string): string => {
  return slugSchema.parse(slug);
};

/**
 * Resolves the effective booking questions for a public event.
 * Returns text strings only — IDs and order are never exposed to the public.
 */
const resolveEffectiveBookingQuestions = async (event: {
  useDefaultQuestions: boolean;
  customQuestions: string[];
}): Promise<string[]> => {
  if (event.useDefaultQuestions) {
    return getDefaultQuestionTexts();
  }
  return event.customQuestions.length > 0 ? event.customQuestions : [];
};

/**
 * List all active teams for public discovery.
 */
export const listTeams = async () => {
  return prisma.team.findMany({
    where: { isActive: true },
    select: publicTeamSelect,
    orderBy: { name: "asc" },
  });
};

export const getTeamBySlug = async (slug: string) => {
  const normalizedSlug = normalizeSlug(slug);

  const team = await prisma.team.findFirst({
    where: {
      publicBookingSlug: normalizedSlug,
      isActive: true,
    },
    select: publicTeamSelect,
  });

  if (!team?.id) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Team not found.");
  }

  return team;
};

/**
 * List all active events for a specific team.
 */
export const listTeamEvents = async (teamId: string) => {
  return prisma.event.findMany({
    where: {
      teamId,
      isActive: true,
      team: { isActive: true },
    },
    select: publicEventSelect,
    orderBy: { name: "asc" },
  });
};

export const listTeamEventsBySlug = async (slug: string) => {
  const team = await getTeamBySlug(slug);
  const events = await listTeamEvents(team.id);
  return { team, events };
};

export const getEventBySlug = async (slug: string) => {
  const normalizedSlug = normalizeSlug(slug);

  const event = await prisma.event.findFirst({
    where: { publicBookingSlug: normalizedSlug },
    select: { ...publicEventSelect, isActive: true },
  });

  if (!event) {
    throw new ErrorHandler(
      StatusCodes.NOT_FOUND,
      "This public booking link is invalid. Please double-check the URL or contact your coordinator.",
    );
  }

  if (!event.isActive || !event.team.isActive) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "This booking page is temporarily inactive. Please contact the administrator or coach if you need to schedule a session.",
    );
  }

  const { isActive: _isActive, ...publicEvent } = event;
  const effectiveBookingQuestions = await resolveEffectiveBookingQuestions(event);
  return { ...publicEvent, effectiveBookingQuestions };
};

export const getCoachBySlug = async (slug: string) => {
  const normalizedSlug = normalizeSlug(slug);

  const coach = await prisma.user.findUnique({
    where: { publicBookingSlug: normalizedSlug },
    select: {
      ...publicCoachSelect,
      role: true,
      isActive: true,
    },
  });

  if (!coach || !coach.isActive || coach.role !== UserRole.COACH) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Coach not found.");
  }

  const { role: _role, isActive: _isActive, ...safeCoach } = coach;
  return safeCoach;
};

export const listCoachEventsBySlug = async (slug: string) => {
  const coach = await getCoachBySlug(slug);

  const events = await prisma.event.findMany({
    where: {
      isActive: true,
      team: { isActive: true },
      coaches: {
        some: {
          coachUserId: coach.id,
          isActive: true,
        },
      },
    },
    select: publicEventSelect,
    orderBy: { name: "asc" },
  });

  return { coach, events };
};

export const getGroupBySlug = async (slug: string) => {
  const normalizedSlug = normalizeSlug(slug);

  const group = await prisma.eventGroup.findUnique({
    where: {
      publicBookingSlug: normalizedSlug,
    },
    select: publicGroupSelect,
  });

  if (!group) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Event group not found.");
  }

  return group;
};

export const listGroupEventsBySlug = async (slug: string) => {
  const group = await getGroupBySlug(slug);

  const events = await prisma.event.findMany({
    where: {
      groupId: group.id,
      isActive: true,
      team: { isActive: true },
    },
    select: publicEventSelect,
    orderBy: { name: "asc" },
  });

  return { group, team: group.team, events };
};

export const getPublicBookingDirectory = async (slug: string) => {
  const normalizedSlug = normalizeSlug(slug);

  const directory = await prisma.bookingDirectory.findUnique({
    where: { slug: normalizedSlug },
    include: {
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
    },
  });

  if (!directory || !directory.isActive) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Booking directory not found.");
  }

  // Collect all active (teamId, eventTypeId) pairs to load events in one query.
  // Events appear in a section when their eventTypeId matches the section's eventTypeId.
  const activePairs: { teamId: string; eventTypeId: string }[] = [];
  for (const section of directory.sections) {
    if (!section.eventType.isActive) continue;
    for (const entry of section.teams) {
      if (!entry.team.isActive) continue;
      activePairs.push({ teamId: entry.teamId, eventTypeId: section.eventTypeId });
    }
  }

  const allEvents =
    activePairs.length > 0
      ? await prisma.event.findMany({
          where: { isActive: true, OR: activePairs },
          select: { ...publicEventSelect, eventTypeId: true },
          orderBy: { name: "asc" },
        })
      : [];

  const eventsByKey = new Map<string, Array<Omit<(typeof allEvents)[number], "eventTypeId">>>();
  for (const { eventTypeId, ...event } of allEvents) {
    const key = `${event.teamId}:${eventTypeId}`;
    const bucket = eventsByKey.get(key) ?? [];
    bucket.push(event);
    eventsByKey.set(key, bucket);
  }

  const sections = [];
  for (const section of directory.sections) {
    if (!section.eventType.isActive) continue;

    const teamsWithEvents = [];
    for (const entry of section.teams) {
      if (!entry.team.isActive) continue;
      const key = `${entry.teamId}:${section.eventTypeId}`;
      teamsWithEvents.push({ team: entry.team, events: eventsByKey.get(key) ?? [] });
    }

    sections.push({ eventType: section.eventType, teams: teamsWithEvents });
  }

  return { id: directory.id, slug: directory.slug, name: directory.name, description: directory.description, sections };
};

const REVEAL_WINDOW_MS = 15 * 60 * 1000;

export const getSlotJoinInfo = async (slotId: string, token: string) => {
  const booking = await prisma.booking.findFirst({
    where: { scheduleSlotId: slotId, sessionToken: token } as any,
    select: { id: true, status: true, timezone: true },
  });

  if (!booking) {
    throw new ErrorHandler(StatusCodes.UNAUTHORIZED, "Invalid session link.");
  }

  if (booking.status === "CANCELLED") {
    const slot = await prisma.eventScheduleSlot.findUnique({
      where: { id: slotId },
      select: {
        startTime: true,
        endTime: true,
        event: {
          select: {
            name: true,
            team: { select: { name: true } },
          },
        },
      },
    });
    return {
      status: "booking_cancelled" as const,
      sessionDetails: slot
        ? {
            eventName: slot.event?.name || "Session",
            eventDescription: null,
            startTime: slot.startTime,
            endTime: slot.endTime,
            durationSeconds: 0,
            teamName: slot.event?.team?.name || null,
            timezone: booking.timezone,
            coachName: null,
            coachAvatarUrl: null,
          }
        : null,
    };
  }

  const slot = await prisma.eventScheduleSlot.findUnique({
    where: { id: slotId },
    select: {
      startTime: true,
      endTime: true,
      isCancelled: true,
      sessionJoinUrl: true,
      coachRevealSentAt: true,
      assignedCoach: { select: { zoomIsvLink: true, firstName: true, lastName: true, avatarUrl: true } },
      event: {
        select: {
          name: true,
          description: true,
          durationSeconds: true,
          meetingLinkSource: true,
          locationValue: true,
          allowAnonymousBooking: true,
          deferCoachReveal: true,
          team: { select: { name: true } },
        },
      },
    },
  });

  if (!slot) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Slot not found.");
  }

  const shouldHideCoach =
    slot.event?.allowAnonymousBooking ||
    (slot.event?.deferCoachReveal && !slot.coachRevealSentAt);

  const sessionDetails = {
    eventName: slot.event?.name || "Session",
    eventDescription: slot.event?.description || null,
    startTime: slot.startTime,
    endTime: slot.endTime,
    durationSeconds: slot.event?.durationSeconds || 0,
    teamName: slot.event?.team?.name || null,
    timezone: booking.timezone,
    coachName:
      !shouldHideCoach && slot.assignedCoach
        ? `${slot.assignedCoach.firstName} ${slot.assignedCoach.lastName}`
        : null,
    coachAvatarUrl: (!shouldHideCoach && slot.assignedCoach?.avatarUrl) || null,
  };

  if (slot.isCancelled) {
    return { status: "slot_cancelled" as const, sessionDetails };
  }

  const msUntilStart = slot.startTime.getTime() - Date.now();
  if (msUntilStart > REVEAL_WINDOW_MS) {
    const minutesUntilAvailable = Math.ceil((msUntilStart - REVEAL_WINDOW_MS) / 60000);
    return {
      status: "pending" as const,
      startsAt: slot.startTime,
      minutesUntilAvailable,
      sessionDetails,
    };
  }

  const rawJoinUrl =
    slot.sessionJoinUrl ||
    slot.assignedCoach?.zoomIsvLink ||
    slot.event?.locationValue ||
    null;

  // Only allow http/https URLs to prevent javascript: or other dangerous schemes
  const joinUrl = (() => {
    if (!rawJoinUrl) return null;
    try {
      const u = new URL(rawJoinUrl);
      return u.protocol === "https:" || u.protocol === "http:" ? rawJoinUrl : null;
    } catch {
      return null;
    }
  })();

  return { status: "available" as const, joinUrl, sessionDetails };
};

export const getPublicBooking = async (id: string, token: string, mode?: string) => {
  const booking = await prisma.booking.findFirst({
    where: { id, rescheduleToken: token } as any,
    include: bookingInclude,
  });

  if (!booking) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Booking not found or invalid token.");
  }

  if (mode === "cancel") {
    assertCancelTokenValid(booking);
  } else {
    assertRescheduleTokenValid(booking);
  }

  return booking;
};
