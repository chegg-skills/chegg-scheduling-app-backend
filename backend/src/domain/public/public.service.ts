import { UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import {
  assertCancelTokenValid,
  assertRescheduleTokenValid,
  bookingInclude,
  getMeetingJoinUrl,
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

export type SlotJoinRedirect =
  | { type: "redirect"; url: string }
  | { type: "status"; state: "invalid" | "booking_cancelled" | "slot_cancelled" | "session_ended" | "no_url" };

// Security model: this link is a *standing* pointer, not a single-use magic link —
// possession of (bookingId, sessionToken) authorizes joining this specific session
// at any point until it's cancelled or its endTime passes, by design (a re-click
// after a coach reassignment must still work). This is a deliberate tradeoff, not
// an oversight — do not "fix" it by making the token single-use.
export const resolveBookingJoinRedirect = async (bookingId: string, token: string): Promise<SlotJoinRedirect> => {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, sessionToken: token },
    select: {
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
    },
  });

  if (!booking) {
    return { type: "status", state: "invalid" };
  }

  if (booking.status === "CANCELLED") {
    return { type: "status", state: "booking_cancelled" };
  }

  // Defense in depth — cancelling a slot already cascades to booking.status via
  // cancelEventScheduleSlot's transaction, so this should rarely fire on its own.
  if (booking.scheduleSlot?.isCancelled) {
    return { type: "status", state: "slot_cancelled" };
  }

  if (booking.endTime && Date.now() > booking.endTime.getTime()) {
    return { type: "status", state: "session_ended" };
  }

  // For FIXED_SLOTS bookings, the slot itself carries the assigned coach
  // (booking.coachUserId is null there) — the slot's pinned coach must be
  // checked before falling back to the booking's own coach relation. This
  // resolved coach link is still routed through getMeetingJoinUrl below so
  // EVENT_LOCATION events keep preferring the shared location over a coach's
  // personal link, matching the admin-facing display (BookingDetailsPanel).
  const coachZoomLink = booking.scheduleSlot?.assignedCoach?.zoomIsvLink ?? booking.coach?.zoomIsvLink ?? null;

  const rawJoinUrl = booking.scheduleSlot?.sessionJoinUrl || getMeetingJoinUrl(booking.event, coachZoomLink);

  // https only — no plaintext downgrade to a coach's meeting room.
  const joinUrl = (() => {
    if (!rawJoinUrl) return null;
    try {
      return new URL(rawJoinUrl).protocol === "https:" ? rawJoinUrl : null;
    } catch {
      return null;
    }
  })();

  if (!joinUrl) {
    return { type: "status", state: "no_url" };
  }

  return { type: "redirect", url: joinUrl };
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

  // Defer Coach Reveal: never expose the assigned coach's identity over the public
  // cancel/reschedule API before the explicit reveal has been sent — mirrors the
  // isDeferredReveal gating already enforced for student-facing notifications.
  const isRevealPending =
    booking.event?.deferCoachReveal === true && !booking.scheduleSlot?.coachRevealSentAt;

  if (isRevealPending) {
    booking.coach = null;
    if (booking.scheduleSlot) {
      booking.scheduleSlot.assignedCoach = null;
    }
  } else {
    // The raw personal Zoom link is never public-safe, reveal-pending or not —
    // only the masked meetingJoinUrl redirect belongs on the public API.
    if (booking.coach) booking.coach.zoomIsvLink = null;
    if (booking.scheduleSlot?.assignedCoach) booking.scheduleSlot.assignedCoach.zoomIsvLink = null;
  }

  return booking;
};
