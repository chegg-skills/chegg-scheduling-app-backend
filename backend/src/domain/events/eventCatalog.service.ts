import { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { rethrowPrismaError } from "../../shared/error/prismaError";
import type { CallerContext } from "../../shared/utils/userUtils";
import { getRequestLogger } from "../../shared/logging/requestContext";
import {
  INTERACTION_TYPE_CAPS,
  INTERACTION_TYPE_KEYS,
  INTERACTION_TYPE_LABELS,
  type InteractionType,
} from "../../shared/constants/interactionType";
import {
  assertCatalogManagementAllowed,
  type SafeEventType,
  type UpsertEventTypeInput,
} from "./event.shared";
import { EventTypeSchema } from "./event.schema";

export type InteractionTypeInfo = {
  key: InteractionType;
  label: string;
  caps: { multipleCoaches: boolean; multipleParticipants: boolean };
};

const createEventType = async (
  payload: UpsertEventTypeInput,
  caller: CallerContext,
): Promise<SafeEventType> => {
  assertCatalogManagementAllowed(caller);

  const validated = EventTypeSchema.body.parse(payload);

  try {
    const eventType = await prisma.eventType.create({
      data: {
        key: validated.key!,
        name: validated.name!,
        description: validated.description,
        color: validated.color,
        sortOrder: validated.sortOrder,
        isActive: validated.isActive,
        createdById: caller.id,
        updatedById: caller.id,
      },
    });
    getRequestLogger().info({ eventTypeId: eventType.id, key: eventType.key, createdBy: caller.id }, "Event type created.");
    return eventType;
  } catch (error) {
    return rethrowPrismaError(error, {
      P2002: {
        status: StatusCodes.CONFLICT,
        message: "An event type with this key already exists.",
      },
    });
  }
};

const listEventTypes = async (): Promise<{ eventTypes: SafeEventType[] }> => {
  const eventTypes = await prisma.eventType.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return { eventTypes };
};

const updateEventType = async (
  eventTypeId: string,
  payload: UpsertEventTypeInput,
  caller: CallerContext,
): Promise<SafeEventType> => {
  assertCatalogManagementAllowed(caller);

  if (!eventTypeId?.trim()) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "eventTypeId is required.");
  }

  const validated = EventTypeSchema.body.parse(payload);

  const data: Prisma.EventTypeUpdateInput = {
    key: validated.key,
    name: validated.name,
    description: validated.description,
    color: validated.color,
    sortOrder: validated.sortOrder,
    isActive: validated.isActive,
    updatedBy: { connect: { id: caller.id } },
  };

  try {
    const eventType = await prisma.eventType.update({
      where: { id: eventTypeId },
      data,
    });
    getRequestLogger().info({ eventTypeId, updatedBy: caller.id }, "Event type updated.");
    return eventType;
  } catch (error) {
    return rethrowPrismaError(error, {
      P2025: {
        status: StatusCodes.NOT_FOUND,
        message: "Event type not found.",
      },
      P2002: {
        status: StatusCodes.CONFLICT,
        message: "An event type with this key already exists.",
      },
    });
  }
};

const getEventTypeUsage = async (
  eventTypeId: string,
  _caller: CallerContext,
): Promise<{ id: string; name: string; team: { id: string; name: string } }[]> => {
  const events = await prisma.event.findMany({
    where: { eventTypeId, deletedAt: null },
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

const deleteEventType = async (
  eventTypeId: string,
  caller: CallerContext,
): Promise<SafeEventType> => {
  assertCatalogManagementAllowed(caller);

  if (!eventTypeId?.trim()) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "eventTypeId is required.");
  }

  const usage = await getEventTypeUsage(eventTypeId, caller);

  if (usage.length > 0) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      `Cannot delete event type as it is currently used by ${usage.length} event(s). Please deactivate it instead.`,
    );
  }

  const directorySectionCount = await prisma.bookingDirectorySection.count({
    where: { eventTypeId },
  });

  if (directorySectionCount > 0) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      `Cannot delete event type as it is referenced in ${directorySectionCount} booking directory section(s). Remove it from the booking directory first.`,
    );
  }

  try {
    const deleted = await prisma.eventType.delete({ where: { id: eventTypeId } });
    getRequestLogger().warn({ eventTypeId, deletedBy: caller.id }, "Event type deleted.");
    return deleted;
  } catch (error) {
    return rethrowPrismaError(error, {
      P2025: {
        status: StatusCodes.NOT_FOUND,
        message: "Event type not found.",
      },
      P2003: {
        status: StatusCodes.CONFLICT,
        message: "Cannot delete event type: it is still referenced by another record.",
      },
    });
  }
};

/**
 * Returns the hardcoded list of interaction types with their capability flags.
 * These are structural constants — not admin-configurable records.
 */
const listInteractionTypes = (): { interactionTypes: InteractionTypeInfo[] } => {
  const interactionTypes = INTERACTION_TYPE_KEYS.map((key) => ({
    key,
    label: INTERACTION_TYPE_LABELS[key],
    caps: INTERACTION_TYPE_CAPS[key],
  }));

  return { interactionTypes };
};

export {
  createEventType,
  listEventTypes,
  updateEventType,
  deleteEventType,
  getEventTypeUsage,
  listInteractionTypes,
};
