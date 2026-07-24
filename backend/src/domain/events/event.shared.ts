import {
  AssignmentStrategy,
  EventLocationType,
  type EventType as EventTypeModel,
  Prisma,
  UserRole,
  SessionLeadershipStrategy,
} from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import type { z } from "zod";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { getManagedTeam } from "../../shared/utils/teamAccess";
import { safeUserSelect, type CallerContext } from "../../shared/utils/userUtils";
import { INTERACTION_TYPE_CAPS } from "../../shared/constants/interactionType";
import type { CreateEventSchema, UpdateEventSchema } from "./event.schema";

export const eventInclude = Prisma.validator<Prisma.EventInclude>()({
  eventType: true,
  coaches: {
    where: { isActive: true },
    orderBy: { coachOrder: "asc" },
    include: {
      coachUser: {
        select: {
          ...safeUserSelect,
          weeklyAvailability: true,
        },
      },
      weeklyAvailabilityOverride: {
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
    },
  },
  team: {
    select: {
      id: true,
      name: true,
    },
  },
  group: {
    select: {
      id: true,
      name: true,
      color: true,
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

// Input types are the schemas' output shapes: the validate() middleware parses the request body
// once at the edge, so by the time these reach the service they are already validated, defaulted,
// and transformed. Deriving from the schema (rather than hand-writing an all-optional mirror) keeps
// this a single source of truth and lets the compiler carry the "already validated" guarantee.
export type CreateEventInput = z.output<typeof CreateEventSchema.body>;
export type UpdateEventInput = z.output<typeof UpdateEventSchema.body>;

export type UpsertEventTypeInput = {
  key?: string;
  name?: string;
  description?: string;
  color?: string | null;
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
    occurrences?: number | null;
    isContinuous?: boolean;
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
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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
  options: { allowCoachMember?: boolean } = {},
): Promise<SafeEvent> => {
  if (!eventId?.trim()) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "eventId is required.");
  }

  const event = await prisma.event.findFirst({
    where: { id: eventId, deletedAt: null },
    include: eventInclude,
  });

  if (!event) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Event not found.");
  }

  if (caller.role === UserRole.COACH && options.allowCoachMember) {
    const coachAssignment = await prisma.eventCoach.findUnique({
      where: {
        eventId_coachUserId: {
          eventId: event.id,
          coachUserId: caller.id,
        },
      },
    });

    if (!coachAssignment || !coachAssignment.isActive) {
      throw new ErrorHandler(
        StatusCodes.FORBIDDEN,
        "You do not have permission to access this event.",
      );
    }

    await getManagedTeam(event.teamId, caller, { allowCoachMember: true, allowInactive: true });
  } else {
    await getManagedTeam(event.teamId, caller, { allowInactive: true });
  }

  return event;
};

export const assertGroupBelongsToTeam = async (groupId: string, teamId: string): Promise<void> => {
  const group = await prisma.eventGroup.findUnique({
    where: { id: groupId },
    select: { teamId: true },
  });

  if (!group) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Selected event group does not exist.");
  }

  if (group.teamId !== teamId) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "Event group does not belong to this event's team.",
    );
  }
};

export const getActiveEventType = async (eventTypeId: string) => {
  const eventType = await prisma.eventType.findUnique({
    where: { id: eventTypeId },
  });

  if (!eventType || !eventType.isActive) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Selected event type is invalid or inactive.");
  }

  return eventType;
};
