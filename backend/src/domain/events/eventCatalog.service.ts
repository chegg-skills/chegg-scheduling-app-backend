import { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { rethrowPrismaError } from "../../shared/error/prismaError";
import type { CallerContext } from "../../shared/utils/userUtils";
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
    return await prisma.eventType.create({
      data: {
        key: validated.key!,
        name: validated.name!,
        description: validated.description,
        sortOrder: validated.sortOrder,
        isActive: validated.isActive,
        createdById: caller.id,
        updatedById: caller.id,
      },
    });
  } catch (error) {
    return rethrowPrismaError(error, {
      P2002: {
        status: StatusCodes.CONFLICT,
        message: "An event offering with this key already exists.",
      },
    });
  }
};

const listEventTypes = async (): Promise<{ offerings: SafeEventType[] }> => {
  const offerings = await prisma.eventType.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return { offerings };
};

const updateEventType = async (
  offeringId: string,
  payload: UpsertEventTypeInput,
  caller: CallerContext,
): Promise<SafeEventType> => {
  assertCatalogManagementAllowed(caller);

  if (!offeringId?.trim()) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "offeringId is required.");
  }

  const validated = EventTypeSchema.body.parse(payload);

  const data: Prisma.EventTypeUpdateInput = {
    key: validated.key,
    name: validated.name,
    description: validated.description,
    sortOrder: validated.sortOrder,
    isActive: validated.isActive,
    updatedBy: { connect: { id: caller.id } },
  };

  try {
    return await prisma.eventType.update({
      where: { id: offeringId },
      data,
    });
  } catch (error) {
    return rethrowPrismaError(error, {
      P2025: {
        status: StatusCodes.NOT_FOUND,
        message: "Event offering not found.",
      },
      P2002: {
        status: StatusCodes.CONFLICT,
        message: "An event offering with this key already exists.",
      },
    });
  }
};

const getEventTypeUsage = async (
  offeringId: string,
  _caller: CallerContext,
): Promise<{ id: string; name: string; team: { id: string; name: string } }[]> => {
  const events = await prisma.event.findMany({
    where: { eventTypeId: offeringId },
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
  offeringId: string,
  caller: CallerContext,
): Promise<SafeEventType> => {
  assertCatalogManagementAllowed(caller);

  if (!offeringId?.trim()) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "offeringId is required.");
  }

  const usage = await getEventTypeUsage(offeringId, caller);

  if (usage.length > 0) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      `Cannot delete event offering as it is currently used by ${usage.length} event(s). Please deactivate it instead.`,
    );
  }

  try {
    return await prisma.eventType.delete({
      where: { id: offeringId },
    });
  } catch (error) {
    return rethrowPrismaError(error, {
      P2025: {
        status: StatusCodes.NOT_FOUND,
        message: "Event offering not found.",
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
