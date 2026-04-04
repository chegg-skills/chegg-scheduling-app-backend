import {
  AssignmentStrategy,
  EventBookingMode,
  EventLocationType,
  type EventOffering as EventOfferingModel,
  type EventInteractionType as EventInteractionTypeModel,
  Prisma,
  UserRole,
} from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { getManagedTeam } from "../../shared/utils/teamAccess";
import {
  safeUserSelect,
  type CallerContext,
} from "../../shared/utils/userUtils";
import { createPublicBookingSlug } from "../../shared/utils/publicBookingSlug";

const eventInclude = Prisma.validator<Prisma.EventInclude>()({
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

type SafeEvent = Prisma.EventGetPayload<{
  include: typeof eventInclude;
}>;

// Catalog entities are now table-backed (not Prisma enum types).
type SafeEventOffering = EventOfferingModel;
type SafeEventInteractionType = EventInteractionTypeModel;

type ListEventsOptions = {
  page?: number;
  pageSize?: number;
};

type CreateEventInput = {
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
};

type UpdateEventInput = CreateEventInput;

type UpsertEventOfferingInput = {
  key?: string;
  name?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
};

type UpsertInteractionTypeInput = {
  key?: string;
  name?: string;
  description?: string;
  supportsRoundRobin?: boolean;
  supportsMultipleHosts?: boolean;
  minHosts?: number;
  maxHosts?: number | null;
  minParticipants?: number;
  maxParticipants?: number | null;
  sortOrder?: number;
  isActive?: boolean;
};

type ReplaceEventHostsInput = {
  hosts: Array<{
    userId: string;
    hostOrder?: number;
  }>;
};

const isValidAssignmentStrategy = (
  value: string,
): value is AssignmentStrategy =>
  Object.values(AssignmentStrategy).includes(value as AssignmentStrategy);

const isValidLocationType = (
  value: string,
): value is EventLocationType =>
  Object.values(EventLocationType).includes(value as EventLocationType);

const parseDurationSeconds = (value: unknown): number => {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "durationSeconds must be a positive integer.",
    );
  }

  return Number(value);
};

const normalizeRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      `${fieldName} is required.`,
    );
  }

  return value.trim();
};

const normalizeOptionalString = (value: unknown, fieldName: string): string | null => {
  if (value === undefined) {
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

const normalizeKey = (value: string): string => {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
};

const parseRequiredEnum = <T extends string>(
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

const parseOptionalEnum = <T extends string>(
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

const parsePositiveInt = (value: unknown, fieldName: string): number => {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      `${fieldName} must be a positive integer.`,
    );
  }
  return Number(value);
};

const parseNonNegativeInt = (value: unknown, fieldName: string): number => {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      `${fieldName} must be a non-negative integer.`,
    );
  }
  return Number(value);
};

const resolveEventSchedulingConfig = (
  payload: CreateEventInput | UpdateEventInput,
  interactionType: EventInteractionTypeModel,
  existing?: SafeEvent,
) => {
  return {
    bookingMode: (payload.bookingMode as EventBookingMode) ?? existing?.bookingMode ?? EventBookingMode.HOST_AVAILABILITY,
    allowedWeekdays: payload.allowedWeekdays ?? existing?.allowedWeekdays ?? [],
    minimumNoticeMinutes:
      payload.minimumNoticeMinutes ?? existing?.minimumNoticeMinutes ?? 0,
    minParticipantCount:
      payload.minParticipantCount ??
      existing?.minParticipantCount ??
      interactionType.minParticipants,
    maxParticipantCount:
      payload.maxParticipantCount ??
      existing?.maxParticipantCount ??
      interactionType.maxParticipants,
  };
};

const validateEventConfiguration = (
  interactionType: EventInteractionTypeModel,
  config: {
    assignmentStrategy: AssignmentStrategy;
    hostCount: number;
  },
): void => {
  if (
    config.assignmentStrategy === AssignmentStrategy.ROUND_ROBIN &&
    !interactionType.supportsRoundRobin
  ) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      `Interaction type "${interactionType.name}" does not support ROUND_ROBIN assignment.`,
    );
  }

  let requiredMinHosts = interactionType.minHosts;
  if (config.assignmentStrategy === AssignmentStrategy.ROUND_ROBIN) {
    requiredMinHosts = Math.max(requiredMinHosts, 2);
  } else {
    // DIRECT events can have 0 hosts for now (assigned later)
    requiredMinHosts = 0;
  }

  if (config.hostCount > 0 && config.hostCount < requiredMinHosts) {
    if (
      config.assignmentStrategy === AssignmentStrategy.ROUND_ROBIN &&
      config.hostCount < 2
    ) {
      throw new ErrorHandler(
        StatusCodes.BAD_REQUEST,
        "ROUND_ROBIN events require at least two hosts.",
      );
    }

    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      `This event requires at least ${requiredMinHosts} host(s) based on its interaction type.`,
    );
  }

  if (
    interactionType.maxHosts !== null &&
    config.hostCount > interactionType.maxHosts
  ) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      `This event exceeds the maximum host limit of ${interactionType.maxHosts} for its interaction type.`,
    );
  }
};

const assertBookingNoticeSatisfied = (
  minimumNoticeMinutes: number,
  bookingStartTime: Date,
) => {
  const now = new Date();
  const noticeMs = minimumNoticeMinutes * 60 * 1000;
  if (bookingStartTime.getTime() - now.getTime() < noticeMs) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "Booking does not satisfy the minimum notice requirement.",
    );
  }
};

const assertBookingWeekdayAllowed = (
  allowedWeekdays: number[],
  bookingTime: Date,
) => {
  if (allowedWeekdays.length === 0) return;
  const day = bookingTime.getUTCDay();
  if (!allowedWeekdays.includes(day)) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "Booking is not allowed on this day of the week.",
    );
  }
};

const getEffectiveParticipantPolicy = (
  event: {
    bookingMode: EventBookingMode;
    minParticipantCount: number | null;
    maxParticipantCount: number | null;
  },
  slotOrInteraction: {
    minParticipants?: number;
    maxParticipants?: number | null;
    capacity?: number | null;
  },
) => {
  if (event.bookingMode === EventBookingMode.FIXED_SLOTS) {
    return {
      minParticipants: event.minParticipantCount ?? slotOrInteraction.minParticipants ?? 1,
      maxParticipants: slotOrInteraction.capacity ?? event.maxParticipantCount ?? slotOrInteraction.maxParticipants ?? null,
    };
  }
  return {
    minParticipants: slotOrInteraction.minParticipants ?? 1,
    maxParticipants: slotOrInteraction.maxParticipants ?? null,
  };
};

const assertParticipantCapacityAvailable = (
  maxParticipants: number | null,
  currentParticipantCount: number,
) => {
  if (maxParticipants !== null && currentParticipantCount >= maxParticipants) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      "This slot has reached its maximum participant capacity.",
    );
  }
};

const resolveMatchingScheduleSlot = async (
  eventId: string,
  startTime: Date,
) => {
  return prisma.eventScheduleSlot.findFirst({
    where: {
      eventId,
      startTime,
      isActive: true,
    },
  });
};

const assertCatalogManagementAllowed = (caller: CallerContext): void => {
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

const createEventOffering = async (
  payload: UpsertEventOfferingInput,
  caller: CallerContext,
): Promise<SafeEventOffering> => {
  assertCatalogManagementAllowed(caller);

  const key = normalizeKey(normalizeRequiredString(payload.key, "key"));
  const name = normalizeRequiredString(payload.name, "name");

  try {
    return await prisma.eventOffering.create({
      data: {
        key,
        name,
        description: normalizeOptionalString(payload.description, "description"),
        sortOrder:
          payload.sortOrder !== undefined
            ? parseNonNegativeInt(payload.sortOrder, "sortOrder")
            : 0,
        isActive: payload.isActive ?? true,
        createdById: caller.id,
        updatedById: caller.id,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ErrorHandler(
        StatusCodes.CONFLICT,
        "An event offering with this key already exists.",
      );
    }

    throw error;
  }
};

const listEventOfferings = async (): Promise<{ offerings: SafeEventOffering[] }> => {
  const offerings = await prisma.eventOffering.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return { offerings };
};

const updateEventOffering = async (
  offeringId: string,
  payload: UpsertEventOfferingInput,
  caller: CallerContext,
): Promise<SafeEventOffering> => {
  assertCatalogManagementAllowed(caller);

  if (!offeringId?.trim()) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "offeringId is required.");
  }

  const data: Prisma.EventOfferingUpdateInput = {
    updatedBy: { connect: { id: caller.id } },
  };

  if (payload.key !== undefined) {
    data.key = normalizeKey(normalizeRequiredString(payload.key, "key"));
  }
  if (payload.name !== undefined) {
    data.name = normalizeRequiredString(payload.name, "name");
  }
  if (payload.description !== undefined) {
    data.description = normalizeOptionalString(payload.description, "description");
  }
  if (payload.sortOrder !== undefined) {
    data.sortOrder = parseNonNegativeInt(payload.sortOrder, "sortOrder");
  }
  if (payload.isActive !== undefined) {
    data.isActive = Boolean(payload.isActive);
  }

  try {
    return await prisma.eventOffering.update({
      where: { id: offeringId },
      data,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new ErrorHandler(StatusCodes.NOT_FOUND, "Event offering not found.");
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ErrorHandler(
        StatusCodes.CONFLICT,
        "An event offering with this key already exists.",
      );
    }

    throw error;
  }
};

const validateInteractionTypePayload = (
  payload: UpsertInteractionTypeInput,
): {
  supportsRoundRobin: boolean;
  supportsMultipleHosts: boolean;
  minHosts: number;
  maxHosts: number | null;
  minParticipants: number;
  maxParticipants: number | null;
} => {
  const supportsRoundRobin = Boolean(payload.supportsRoundRobin);
  const supportsMultipleHosts = Boolean(payload.supportsMultipleHosts);
  const minHosts =
    payload.minHosts !== undefined ? parsePositiveInt(payload.minHosts, "minHosts") : 1;
  const maxHosts =
    payload.maxHosts === undefined || payload.maxHosts === null
      ? null
      : parsePositiveInt(payload.maxHosts, "maxHosts");
  const minParticipants =
    payload.minParticipants !== undefined
      ? parsePositiveInt(payload.minParticipants, "minParticipants")
      : 1;
  const maxParticipants =
    payload.maxParticipants === undefined || payload.maxParticipants === null
      ? null
      : parsePositiveInt(payload.maxParticipants, "maxParticipants");

  if (!supportsMultipleHosts && minHosts > 1) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "minHosts cannot be greater than 1 when supportsMultipleHosts is false.",
    );
  }

  if (maxHosts !== null && maxHosts < minHosts) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "maxHosts cannot be less than minHosts.",
    );
  }

  if (maxParticipants !== null && maxParticipants < minParticipants) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "maxParticipants cannot be less than minParticipants.",
    );
  }

  if (supportsRoundRobin && !supportsMultipleHosts) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "supportsRoundRobin requires supportsMultipleHosts to be true.",
    );
  }

  if (supportsMultipleHosts && maxHosts !== null && maxHosts < 2) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "When supportsMultipleHosts is true, maxHosts must be at least 2 or null.",
    );
  }

  return {
    supportsRoundRobin,
    supportsMultipleHosts,
    minHosts,
    maxHosts,
    minParticipants,
    maxParticipants,
  };
};

const createInteractionType = async (
  payload: UpsertInteractionTypeInput,
  caller: CallerContext,
): Promise<SafeEventInteractionType> => {
  assertCatalogManagementAllowed(caller);

  const key = normalizeKey(normalizeRequiredString(payload.key, "key"));
  const name = normalizeRequiredString(payload.name, "name");
  const validated = validateInteractionTypePayload(payload);

  try {
    return await prisma.eventInteractionType.create({
      data: {
        key,
        name,
        description: normalizeOptionalString(payload.description, "description"),
        ...validated,
        sortOrder:
          payload.sortOrder !== undefined
            ? parseNonNegativeInt(payload.sortOrder, "sortOrder")
            : 0,
        isActive: payload.isActive ?? true,
        createdById: caller.id,
        updatedById: caller.id,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ErrorHandler(
        StatusCodes.CONFLICT,
        "An interaction type with this key already exists.",
      );
    }

    throw error;
  }
};

const listInteractionTypes = async (): Promise<{ interactionTypes: SafeEventInteractionType[] }> => {
  const interactionTypes = await prisma.eventInteractionType.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return { interactionTypes };
};

const updateInteractionType = async (
  interactionTypeId: string,
  payload: UpsertInteractionTypeInput,
  caller: CallerContext,
): Promise<SafeEventInteractionType> => {
  assertCatalogManagementAllowed(caller);

  if (!interactionTypeId?.trim()) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "interactionTypeId is required.",
    );
  }

  const existing = await prisma.eventInteractionType.findUnique({
    where: { id: interactionTypeId },
  });

  if (!existing) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Interaction type not found.");
  }

  const mergedPayload: UpsertInteractionTypeInput = {
    supportsRoundRobin:
      payload.supportsRoundRobin ?? existing.supportsRoundRobin,
    supportsMultipleHosts:
      payload.supportsMultipleHosts ?? existing.supportsMultipleHosts,
    minHosts: payload.minHosts ?? existing.minHosts,
    maxHosts:
      payload.maxHosts !== undefined ? payload.maxHosts : existing.maxHosts,
    minParticipants: payload.minParticipants ?? existing.minParticipants,
    maxParticipants:
      payload.maxParticipants !== undefined
        ? payload.maxParticipants
        : existing.maxParticipants,
  };

  const validated = validateInteractionTypePayload(mergedPayload);

  const data: Prisma.EventInteractionTypeUpdateInput = {
    updatedBy: { connect: { id: caller.id } },
    ...validated,
  };

  if (payload.key !== undefined) {
    data.key = normalizeKey(normalizeRequiredString(payload.key, "key"));
  }
  if (payload.name !== undefined) {
    data.name = normalizeRequiredString(payload.name, "name");
  }
  if (payload.description !== undefined) {
    data.description = normalizeOptionalString(payload.description, "description");
  }
  if (payload.sortOrder !== undefined) {
    data.sortOrder = parseNonNegativeInt(payload.sortOrder, "sortOrder");
  }
  if (payload.isActive !== undefined) {
    data.isActive = Boolean(payload.isActive);
  }

  try {
    return await prisma.eventInteractionType.update({
      where: { id: interactionTypeId },
      data,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ErrorHandler(
        StatusCodes.CONFLICT,
        "An interaction type with this key already exists.",
      );
    }

    throw error;
  }
};

const getInteractionTypeUsage = async (
  interactionTypeId: string,
  caller: CallerContext,
): Promise<{ id: string; name: string; team: { id: string; name: string } }[]> => {
  const events = await prisma.event.findMany({
    where: { interactionTypeId },
    select: {
      id: true,
      name: true,
      team: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return events;
};

const deleteInteractionType = async (
  interactionTypeId: string,
  caller: CallerContext,
): Promise<SafeEventInteractionType> => {
  assertCatalogManagementAllowed(caller);

  const usage = await getInteractionTypeUsage(interactionTypeId, caller);
  if (usage.length > 0) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      `Cannot delete interaction type as it is currently used by ${usage.length} event(s).`,
    );
  }

  try {
    return await prisma.eventInteractionType.delete({
      where: { id: interactionTypeId },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new ErrorHandler(StatusCodes.NOT_FOUND, "Interaction type not found.");
    }
    throw error;
  }
};

const listEventScheduleSlots = async (
  eventId: string,
  caller: CallerContext,
): Promise<{ slots: any[] }> => {
  const slots = await prisma.eventScheduleSlot.findMany({
    where: { eventId },
    orderBy: { startTime: "asc" },
  });
  return { slots };
};

const createEventScheduleSlot = async (
  eventId: string,
  payload: {
    startTime: string | Date;
    endTime: string | Date;
    isActive?: boolean;
    capacity?: number;
  },
  caller: CallerContext,
): Promise<any> => {
  await getManagedEvent(eventId, caller);

  return prisma.eventScheduleSlot.create({
    data: {
      eventId,
      startTime: new Date(payload.startTime),
      endTime: new Date(payload.endTime),
      capacity: payload.capacity !== undefined ? parseNonNegativeInt(payload.capacity, "capacity") : null,
      isActive: payload.isActive ?? true,
    },
  });
};

const updateEventScheduleSlot = async (
  eventId: string,
  slotId: string,
  payload: {
    startTime?: string | Date;
    endTime?: string | Date;
    isActive?: boolean;
    capacity?: number;
  },
  caller: CallerContext,
): Promise<any> => {
  await getManagedEvent(eventId, caller);
  const slot = await prisma.eventScheduleSlot.findUnique({
    where: { id: slotId },
  });
  if (!slot || slot.eventId !== eventId) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Schedule slot not found for this event.");
  }

  const data: any = {};
  if (payload.startTime !== undefined) data.startTime = new Date(payload.startTime);
  if (payload.endTime !== undefined) data.endTime = new Date(payload.endTime);
  if (payload.isActive !== undefined) data.isActive = Boolean(payload.isActive);
  if (payload.capacity !== undefined) {
    data.capacity = payload.capacity !== null ? parseNonNegativeInt(payload.capacity, "capacity") : null;
  }

  return prisma.eventScheduleSlot.update({
    where: { id: slotId },
    data,
  });
};

const deleteEventScheduleSlot = async (
  eventId: string,
  slotId: string,
  caller: CallerContext,
): Promise<any> => {
  await getManagedEvent(eventId, caller);
  const slot = await prisma.eventScheduleSlot.findUnique({
    where: { id: slotId },
  });
  if (!slot || slot.eventId !== eventId) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Schedule slot not found for this event.");
  }

  return prisma.eventScheduleSlot.delete({
    where: { id: slotId },
  });
};

const getManagedEvent = async (
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

const getActiveOffering = async (offeringId: string) => {
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

const getActiveInteractionType = async (interactionTypeId: string) => {
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



const buildCreateEventData = (
  payload: CreateEventInput,
  callerId: string,
  teamId: string,
  offeringId: string,
  interactionTypeId: string,
): Prisma.EventCreateInput => {
  const name = normalizeRequiredString(payload.name, "name");
  const assignmentStrategy = parseRequiredEnum(
    payload.assignmentStrategy ?? AssignmentStrategy.DIRECT,
    "assignmentStrategy",
    isValidAssignmentStrategy,
  );
  const durationSeconds = parseDurationSeconds(payload.durationSeconds);
  const locationType = parseRequiredEnum(
    payload.locationType,
    "locationType",
    isValidLocationType,
  );
  const locationValue = normalizeRequiredString(
    payload.locationValue,
    "locationValue",
  );

  const schedulingConfig = resolveEventSchedulingConfig(
    payload,
    { minParticipants: 1, maxParticipants: 1 } as any, // Temporary for type safety if needed, but buildCreateEventData is called from createEvent where we have the real interactionType
  );

  return {
    name,
    publicBookingSlug: createPublicBookingSlug(name, "event"),
    description: normalizeOptionalString(payload.description, "description"),
    offering: { connect: { id: offeringId } },
    interactionType: { connect: { id: interactionTypeId } },
    assignmentStrategy,
    durationSeconds,
    locationType,
    locationValue,
    isActive: payload.isActive ?? true,
    team: { connect: { id: teamId } },
    createdBy: { connect: { id: callerId } },
    updatedBy: { connect: { id: callerId } },
    ...schedulingConfig,
  };
};

const createEvent = async (
  teamId: string,
  payload: CreateEventInput,
  caller: CallerContext,
): Promise<SafeEvent> => {
  await getManagedTeam(teamId, caller);

  const offeringId = normalizeRequiredString(payload.offeringId, "offeringId");
  const interactionTypeId = normalizeRequiredString(
    payload.interactionTypeId,
    "interactionTypeId",
  );

  const offering = await getActiveOffering(offeringId);
  const interactionType = await getActiveInteractionType(interactionTypeId);

  const strategy = parseOptionalEnum(
    payload.assignmentStrategy,
    "assignmentStrategy",
    isValidAssignmentStrategy,
  ) ?? AssignmentStrategy.DIRECT;

  validateEventConfiguration(interactionType, {
    assignmentStrategy: strategy,
    hostCount: 0, // No hosts yet on create
  });

  const schedulingConfig = resolveEventSchedulingConfig(
    payload,
    interactionType,
  );

  return prisma.event.create({
    data: {
      ...buildCreateEventData(
        { ...payload, assignmentStrategy: strategy },
        caller.id,
        teamId,
        offering.id,
        interactionType.id,
      ),
      ...schedulingConfig,
    },
    include: eventInclude,
  });
};

const listTeamEvents = async (
  teamId: string,
  caller: CallerContext,
  options: ListEventsOptions = {},
): Promise<{
  events: SafeEvent[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}> => {
  await getManagedTeam(teamId, caller, { allowInactive: true });

  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 50));
  const skip = (page - 1) * pageSize;

  const [events, total] = await prisma.$transaction([
    prisma.event.findMany({
      where: { teamId },
      include: eventInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.event.count({ where: { teamId } }),
  ]);

  return {
    events,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

const readEvent = async (
  eventId: string,
  caller: CallerContext,
): Promise<SafeEvent> => {
  return getManagedEvent(eventId, caller);
};

const updateEvent = async (
  eventId: string,
  payload: UpdateEventInput,
  caller: CallerContext,
): Promise<SafeEvent> => {
  const existingEvent = await getManagedEvent(eventId, caller);

  const updateData: Prisma.EventUpdateInput = {
    updatedBy: { connect: { id: caller.id } },
  };

  if (payload.name !== undefined) {
    const normalizedName = normalizeRequiredString(payload.name, "name");
    updateData.name = normalizedName;

    if (!existingEvent.publicBookingSlug) {
      updateData.publicBookingSlug = createPublicBookingSlug(normalizedName, "event");
    }
  }

  if (payload.description !== undefined) {
    updateData.description = normalizeOptionalString(payload.description, "description");
  }

  const nextOfferingId =
    payload.offeringId !== undefined
      ? normalizeRequiredString(payload.offeringId, "offeringId")
      : existingEvent.offeringId;

  const nextInteractionTypeId =
    payload.interactionTypeId !== undefined
      ? normalizeRequiredString(payload.interactionTypeId, "interactionTypeId")
      : existingEvent.interactionTypeId;

  const offering = await getActiveOffering(nextOfferingId);
  const interactionType = await getActiveInteractionType(nextInteractionTypeId);

  updateData.offering = { connect: { id: offering.id } };
  updateData.interactionType = { connect: { id: interactionType.id } };

  if (payload.assignmentStrategy !== undefined) {
    updateData.assignmentStrategy = parseOptionalEnum(
      payload.assignmentStrategy,
      "assignmentStrategy",
      isValidAssignmentStrategy,
    );
  }

  const nextAssignmentStrategy =
    (updateData.assignmentStrategy as AssignmentStrategy | undefined) ??
    existingEvent.assignmentStrategy;

  validateEventConfiguration(interactionType, {
    assignmentStrategy: nextAssignmentStrategy,
    hostCount: existingEvent.hosts.length,
  });

  const schedulingConfig = resolveEventSchedulingConfig(
    payload,
    interactionType,
    existingEvent,
  );

  Object.assign(updateData, schedulingConfig);

  if (payload.durationSeconds !== undefined) {
    updateData.durationSeconds = parseDurationSeconds(payload.durationSeconds);
  }

  const nextLocationType =
    payload.locationType !== undefined
      ? parseOptionalEnum(
        payload.locationType,
        "locationType",
        isValidLocationType,
      )
      : existingEvent.locationType;

  const nextLocationValue =
    payload.locationValue !== undefined
      ? normalizeRequiredString(payload.locationValue, "locationValue")
      : existingEvent.locationValue;

  if (!nextLocationValue) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "locationValue is required.",
    );
  }

  updateData.locationType = nextLocationType;
  updateData.locationValue = nextLocationValue;

  if (payload.isActive !== undefined) {
    updateData.isActive = Boolean(payload.isActive);
  }

  let updatedEvent: SafeEvent;
  try {
    updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
      include: eventInclude,
    });
  } catch (error) {
    console.error("Failed to update event:", error);
    throw error;
  }

  if (
    updatedEvent.assignmentStrategy === AssignmentStrategy.ROUND_ROBIN &&
    updatedEvent.hosts.length < 2
  ) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "ROUND_ROBIN events require at least two hosts.",
    );
  }

  if (updatedEvent.assignmentStrategy !== AssignmentStrategy.ROUND_ROBIN) {
    await prisma.eventRoutingState.deleteMany({ where: { eventId } });
  } else if (updatedEvent.hosts.length > 0) {
    await prisma.eventRoutingState.upsert({
      where: { eventId },
      update: { nextHostOrder: 1 },
      create: { eventId, nextHostOrder: 1 },
    });
  }

  return prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    include: eventInclude,
  });
};

const deleteEvent = async (
  eventId: string,
  caller: CallerContext,
): Promise<SafeEvent> => {
  const event = await getManagedEvent(eventId, caller);

  // Check for bookings
  const bookingCount = await prisma.booking.count({
    where: { eventId, status: { not: "CANCELLED" } },
  });

  if (bookingCount > 0) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      `Cannot delete an event that has active booking(s). Please deactivate it instead.`,
    );
  }

  return prisma.event.delete({
    where: { id: eventId },
    include: eventInclude,
  });
};

const normalizeHostInputs = (
  payload: ReplaceEventHostsInput,
): Array<{ userId: string; hostOrder: number }> => {
  if (!Array.isArray(payload.hosts)) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "hosts must be an array.",
    );
  }

  const withOrder = payload.hosts.map((host, index) => {
    const userId = normalizeRequiredString(host?.userId, "userId");
    const rawHostOrder = host?.hostOrder;

    if (
      rawHostOrder !== undefined &&
      (!Number.isInteger(rawHostOrder) || Number(rawHostOrder) <= 0)
    ) {
      throw new ErrorHandler(
        StatusCodes.BAD_REQUEST,
        "hostOrder must be a positive integer when provided.",
      );
    }

    return {
      userId,
      hostOrder: rawHostOrder ?? index + 1,
    };
  });

  const uniqueUserIds = new Set(withOrder.map((host) => host.userId));
  if (uniqueUserIds.size !== withOrder.length) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "Each host userId must be unique.",
    );
  }

  return withOrder
    .sort((left, right) => left.hostOrder - right.hostOrder)
    .map((host, index) => ({
      userId: host.userId,
      hostOrder: index + 1,
    }));
};

const validateEventHosts = async (
  teamId: string,
  event: {
    interactionType: EventInteractionTypeModel;
    assignmentStrategy: AssignmentStrategy;
  },
  hosts: Array<{ userId: string; hostOrder: number }>,
): Promise<void> => {
  validateEventConfiguration(event.interactionType, {
    assignmentStrategy: event.assignmentStrategy,
    hostCount: hosts.length,
  });

  if (hosts.length === 0) {
    return;
  }

  const userIds = hosts.map((host) => host.userId);
  const [users, memberships] = await prisma.$transaction([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, role: true, isActive: true },
    }),
    prisma.teamMember.findMany({
      where: {
        teamId,
        isActive: true,
        userId: { in: userIds },
      },
      select: { userId: true },
    }),
  ]);

  if (users.length !== userIds.length) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "One or more selected hosts do not exist.",
    );
  }

  const membershipIds = new Set(memberships.map((membership) => membership.userId));
  for (const user of users) {
    if (!user.isActive) {
      throw new ErrorHandler(
        StatusCodes.BAD_REQUEST,
        "Only active users can be assigned to an event.",
      );
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ErrorHandler(
        StatusCodes.BAD_REQUEST,
        "SUPER_ADMIN users cannot be assigned as event hosts.",
      );
    }

    if (!membershipIds.has(user.id)) {
      throw new ErrorHandler(
        StatusCodes.BAD_REQUEST,
        "All hosts must be active members of the event's team.",
      );
    }
  }
};

const syncRoutingState = async (
  tx: Prisma.TransactionClient,
  eventId: string,
  assignmentStrategy: AssignmentStrategy,
  hostCount: number,
): Promise<void> => {
  if (assignmentStrategy === AssignmentStrategy.ROUND_ROBIN && hostCount > 0) {
    await tx.eventRoutingState.upsert({
      where: { eventId },
      update: { nextHostOrder: 1 },
      create: { eventId, nextHostOrder: 1 },
    });
    return;
  }

  await tx.eventRoutingState.deleteMany({ where: { eventId } });
};

const listEventHosts = async (
  eventId: string,
  caller: CallerContext,
): Promise<{ hosts: SafeEvent["hosts"] }> => {
  const event = await getManagedEvent(eventId, caller);
  return { hosts: event.hosts };
};

const replaceEventHosts = async (
  eventId: string,
  payload: ReplaceEventHostsInput,
  caller: CallerContext,
): Promise<{ hosts: SafeEvent["hosts"] }> => {
  const event = await getManagedEvent(eventId, caller);
  const normalizedHosts = normalizeHostInputs(payload);

  if (
    event.assignmentStrategy === AssignmentStrategy.ROUND_ROBIN &&
    normalizedHosts.length < 2
  ) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "ROUND_ROBIN events require at least two hosts.",
    );
  }

  await validateEventHosts(event.teamId, event, normalizedHosts);

  await prisma.$transaction(async (tx) => {
    await tx.eventHost.deleteMany({ where: { eventId } });

    if (normalizedHosts.length > 0) {
      await tx.eventHost.createMany({
        data: normalizedHosts.map((host) => ({
          eventId,
          hostUserId: host.userId,
          hostOrder: host.hostOrder,
        })),
      });
    }

    await tx.event.update({
      where: { id: eventId },
      data: {
        updatedById: caller.id,
      },
    });

    await syncRoutingState(
      tx,
      eventId,
      event.assignmentStrategy,
      normalizedHosts.length,
    );
  });

  const refreshedEvent = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    include: eventInclude,
  });

  return { hosts: refreshedEvent.hosts };
};

const removeEventHost = async (
  eventId: string,
  userId: string,
  caller: CallerContext,
): Promise<{ hosts: SafeEvent["hosts"] }> => {
  const event = await getManagedEvent(eventId, caller);

  if (!userId?.trim()) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "userId is required.");
  }

  const remainingHosts = event.hosts
    .filter((host) => host.hostUserId !== userId)
    .map((host, index) => ({
      userId: host.hostUserId,
      hostOrder: index + 1,
    }));

  if (remainingHosts.length === event.hosts.length) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Event host not found.");
  }

  await validateEventHosts(event.teamId, event, remainingHosts);

  await prisma.$transaction(async (tx) => {
    await tx.eventHost.deleteMany({ where: { eventId } });

    if (remainingHosts.length > 0) {
      await tx.eventHost.createMany({
        data: remainingHosts.map((host) => ({
          eventId,
          hostUserId: host.userId,
          hostOrder: host.hostOrder,
        })),
      });
    }

    await tx.event.update({
      where: { id: eventId },
      data: { updatedById: caller.id },
    });

    await syncRoutingState(
      tx,
      eventId,
      event.assignmentStrategy,
      remainingHosts.length,
    );
  });

  const refreshedEvent = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    include: eventInclude,
  });

  return { hosts: refreshedEvent.hosts };
};

export {
  createEventOffering,
  listEventOfferings,
  updateEventOffering,
  createInteractionType,
  listInteractionTypes,
  updateInteractionType,
  deleteInteractionType,
  getInteractionTypeUsage,
  createEvent,
  deleteEvent,
  listEventHosts,
  listTeamEvents,
  readEvent,
  removeEventHost,
  replaceEventHosts,
  updateEvent,
  listEventScheduleSlots,
  createEventScheduleSlot,
  updateEventScheduleSlot,
  deleteEventScheduleSlot,
  assertBookingNoticeSatisfied,
  assertBookingWeekdayAllowed,
  getEffectiveParticipantPolicy,
  assertParticipantCapacityAvailable,
  resolveMatchingScheduleSlot,
  type SafeEvent,
};
