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
  type SafeEventOffering,
  type UpsertEventOfferingInput,
} from "./event.shared";
import { EventOfferingSchema } from "./event.schema";

export type InteractionTypeInfo = {
  key: InteractionType;
  label: string;
  caps: { multipleCoaches: boolean; multipleParticipants: boolean };
};

const createEventOffering = async (
  payload: UpsertEventOfferingInput,
  caller: CallerContext,
): Promise<SafeEventOffering> => {
  assertCatalogManagementAllowed(caller);

  const validated = EventOfferingSchema.body.parse(payload);

  try {
    return await prisma.eventOffering.create({
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

  const validated = EventOfferingSchema.body.parse(payload);

  const data: Prisma.EventOfferingUpdateInput = {
    key: validated.key,
    name: validated.name,
    description: validated.description,
    sortOrder: validated.sortOrder,
    isActive: validated.isActive,
    updatedBy: { connect: { id: caller.id } },
  };

  try {
    return await prisma.eventOffering.update({
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

const getEventOfferingUsage = async (
  offeringId: string,
  _caller: CallerContext,
): Promise<{ id: string; name: string; team: { id: string; name: string } }[]> => {
  const events = await prisma.event.findMany({
    where: { offeringId },
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

const deleteEventOffering = async (
  offeringId: string,
  caller: CallerContext,
): Promise<SafeEventOffering> => {
  assertCatalogManagementAllowed(caller);

  if (!offeringId?.trim()) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "offeringId is required.");
  }

  const usage = await getEventOfferingUsage(offeringId, caller);

  if (usage.length > 0) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      `Cannot delete event offering as it is currently used by ${usage.length} event(s). Please deactivate it instead.`,
    );
  }

  try {
    return await prisma.eventOffering.delete({
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
  createEventOffering,
  listEventOfferings,
  updateEventOffering,
  deleteEventOffering,
  getEventOfferingUsage,
  listInteractionTypes,
};
