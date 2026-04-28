import {
  AssignmentStrategy,
  EventLocationType,
  type EventType as EventTypeModel,
  Prisma,
  UserRole,
  SessionLeadershipStrategy,
  InteractionType,
} from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { getManagedTeam } from "../../shared/utils/teamAccess";
import { safeUserSelect, type CallerContext } from "../../shared/utils/userUtils";
import { INTERACTION_TYPE_CAPS } from "../../shared/constants/interactionType";

export const eventInclude = Prisma.validator<Prisma.EventInclude>()({
  eventType: true,
  coaches: {
    where: { isActive: true },
    orderBy: { coachOrder: "asc" },
    include: {
      coachUser: { select: safeUserSelect },
    },
  },
  weeklyAvailability: true,
  team: {
    select: {
      id: true,
      name: true,
    },
  },
  _count: {
    select: {
      bookings: true,
      scheduleSlots: true,
    },
  },
});

export type SafeEvent = Prisma.EventGetPayload<{
  include: typeof eventInclude;
}>;

export type SafeEventType = EventTypeModel;

export type ListEventsOptions = {
  page?: number;
  pageSize?: number;
};

export type CreateEventInput = {
  name: string;
  description?: string | null;
  eventTypeId?: string;
  interactionType?: InteractionType;
  assignmentStrategy?: string;
  durationSeconds?: number;
  locationType?: string;
  locationValue?: string;
  isActive?: boolean;
  bookingMode?: string;
  allowedWeekdays?: number[];
  minimumNoticeMinutes?: number;
  minParticipantCount?: number | null;
  maxParticipantCount?: number | null;
  minCoachCount?: number;
  maxCoachCount?: number | null;
  targetCoHostCount?: number | null;
  sessionLeadershipStrategy?: string;
  fixedLeadCoachId?: string | null;
  bufferAfterMinutes?: number;
  maxBookingWindowDays?: number | null;
  showDescription?: boolean;
  weeklyAvailability?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
};

export type UpdateEventInput = Partial<CreateEventInput>;

export type UpsertEventTypeInput = {
  key?: string;
  name?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type ReplaceEventCoachesInput = {
  coaches: Array<{
    userId: string;
    coachOrder?: number;
  }>;
};

// Input types below are already using Coach nomenclature

export type UpsertEventScheduleSlotInput = {
  startTime?: string | Date;
  endTime?: string | Date;
  isActive?: boolean;
  isCancelled?: boolean;
  capacity?: number | null;
  assignedCoachId?: string | null;
  recurrence?: {
    frequency: "WEEKLY" | "BI_WEEKLY" | "MONTHLY" | "TWICE_A_MONTH" | "THRICE_A_WEEK";
    occurrences: number;
  } | null;
};

export const isValidAssignmentStrategy = (value: string): value is AssignmentStrategy =>
  Object.values(AssignmentStrategy).includes(value as AssignmentStrategy);

export const isValidLocationType = (value: string): value is EventLocationType =>
  Object.values(EventLocationType).includes(value as EventLocationType);

export const isValidSessionLeadershipStrategy = (
  value: string,
): value is SessionLeadershipStrategy =>
  Object.values(SessionLeadershipStrategy).includes(value as SessionLeadershipStrategy);

export const normalizeKey = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
};

export const assertCatalogManagementAllowed = (caller: CallerContext): void => {
  if (caller.role !== UserRole.SUPER_ADMIN && caller.role !== UserRole.TEAM_ADMIN) {
    throw new ErrorHandler(
      StatusCodes.FORBIDDEN,
      "You do not have permission to manage event catalogs.",
    );
  }
};

export const getManagedEvent = async (
  eventId: string,
  caller: CallerContext,
): Promise<SafeEvent> => {
  if (!eventId?.trim()) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "eventId is required.");
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: eventInclude,
  });

  if (!event) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Event not found.");
  }

  await getManagedTeam(event.teamId, caller, { allowInactive: true });
  return event;
};

export const getActiveEventType = async (eventTypeId: string) => {
  const eventType = await prisma.eventType.findUnique({
    where: { id: eventTypeId },
  });

  if (!eventType || !eventType.isActive) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "Selected event type is invalid or inactive.",
    );
  }

  return eventType;
};
