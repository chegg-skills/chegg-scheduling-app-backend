import {
  AssignmentStrategy,
  EventLocationType,
  type EventInteractionType as EventInteractionTypeModel,
  type EventOffering as EventOfferingModel,
  Prisma,
  UserRole,
  SessionLeadershipStrategy,
} from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { getManagedTeam } from "../../shared/utils/teamAccess";
import {
  safeUserSelect,
  type CallerContext,
} from "../../shared/utils/userUtils";

export const eventInclude = Prisma.validator<Prisma.EventInclude>()({
  offering: true,
  interactionType: true,
  hosts: {
    where: { isActive: true },
    orderBy: { hostOrder: "asc" },
    include: {
      hostUser: { select: safeUserSelect },
    },
  },
});

export type SafeEvent = Prisma.EventGetPayload<{
  include: typeof eventInclude;
}>;

export type SafeEventOffering = EventOfferingModel;
export type SafeEventInteractionType = EventInteractionTypeModel;

export type ListEventsOptions = {
  page?: number;
  pageSize?: number;
};

export type CreateEventInput = {
  name: string;
  description?: string;
  offeringId?: string;
  interactionTypeId?: string;
  assignmentStrategy?: string;
  durationSeconds?: number;
  locationType?: string;
  locationValue?: string;
  isActive?: boolean;
  bookingMode?: string;
  allowedWeekdays?: number[];
  minimumNoticeMinutes?: number;
  minParticipantCount?: number;
  maxParticipantCount?: number;
  sessionLeadershipStrategy?: string;
  fixedLeadHostId?: string;
};

export type UpdateEventInput = CreateEventInput;

export type UpsertEventOfferingInput = {
  key?: string;
  name?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpsertInteractionTypeInput = {
  key?: string;
  name?: string;
  description?: string;
  supportsRoundRobin?: boolean;
  supportsMultipleHosts?: boolean;
  minHosts?: number;
  maxHosts?: number | null;
  minParticipants?: number;
  maxParticipants?: number | null;
  supportsSimultaneousCoaches?: boolean;
  sortOrder?: number;
  isActive?: boolean;
};

export type ReplaceEventHostsInput = {
  hosts: Array<{
    userId: string;
    hostOrder?: number;
  }>;
};

export type UpsertEventScheduleSlotInput = {
  startTime?: string | Date;
  endTime?: string | Date;
  isActive?: boolean;
  capacity?: number | null;
};

export const isValidAssignmentStrategy = (
  value: string,
): value is AssignmentStrategy =>
  Object.values(AssignmentStrategy).includes(value as AssignmentStrategy);

export const isValidLocationType = (
  value: string,
): value is EventLocationType =>
  Object.values(EventLocationType).includes(value as EventLocationType);

export const isValidSessionLeadershipStrategy = (
  value: string,
): value is SessionLeadershipStrategy =>
  Object.values(SessionLeadershipStrategy).includes(value as SessionLeadershipStrategy);

export const parseDurationSeconds = (value: unknown): number => {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "durationSeconds must be a positive integer.",
    );
  }

  return Number(value);
};

export const normalizeRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      `${fieldName} is required.`,
    );
  }

  return value.trim();
};

export const normalizeOptionalString = (value: unknown, fieldName: string): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      `${fieldName} must be a string.`,
    );
  }

  return value.trim() || null;
};

export const normalizeKey = (value: string): string => {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
};

export const parseRequiredEnum = <T extends string>(
  value: unknown,
  fieldName: string,
  validator: (candidate: string) => candidate is T,
): T => {
  const normalized = normalizeRequiredString(value, fieldName);
  if (!validator(normalized)) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, `Invalid ${fieldName}.`);
  }

  return normalized;
};

export const parseOptionalEnum = <T extends string>(
  value: unknown,
  fieldName: string,
  validator: (candidate: string) => candidate is T,
): T | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const normalized = normalizeRequiredString(value, fieldName);
  if (!validator(normalized)) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, `Invalid ${fieldName}.`);
  }

  return normalized;
};

export const parsePositiveInt = (value: unknown, fieldName: string): number => {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      `${fieldName} must be a positive integer.`,
    );
  }
  return Number(value);
};

export const parseNonNegativeInt = (value: unknown, fieldName: string): number => {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      `${fieldName} must be a non-negative integer.`,
    );
  }
  return Number(value);
};

export const assertCatalogManagementAllowed = (caller: CallerContext): void => {
  if (
    caller.role !== UserRole.SUPER_ADMIN &&
    caller.role !== UserRole.TEAM_ADMIN
  ) {
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

export const getActiveOffering = async (offeringId: string) => {
  const offering = await prisma.eventOffering.findUnique({
    where: { id: offeringId },
  });

  if (!offering || !offering.isActive) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "Selected event offering is invalid or inactive.",
    );
  }

  return offering;
};

export const getActiveInteractionType = async (interactionTypeId: string) => {
  const interactionType = await prisma.eventInteractionType.findUnique({
    where: { id: interactionTypeId },
  });

  if (!interactionType || !interactionType.isActive) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "Selected interaction type is invalid or inactive.",
    );
  }

  return interactionType;
};
