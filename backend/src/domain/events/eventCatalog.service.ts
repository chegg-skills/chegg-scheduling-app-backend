import { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { rethrowPrismaError } from "../../shared/error/prismaError";
import type { CallerContext } from "../../shared/utils/userUtils";
import {
  assertCatalogManagementAllowed,
  type SafeEventInteractionType,
  type SafeEventOffering,
  type UpsertEventOfferingInput,
  type UpsertInteractionTypeInput,
} from "./event.shared";
import { EventOfferingSchema, InteractionTypeSchema } from "./event.schema";

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

  // Strip non-Prisma fields
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

  // Hard delete: Remove the offering if it's not in use
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

const createInteractionType = async (
  payload: UpsertInteractionTypeInput,
  caller: CallerContext,
): Promise<SafeEventInteractionType> => {
  assertCatalogManagementAllowed(caller);

  const validated = InteractionTypeSchema.body.parse(payload);

  try {
    return await prisma.eventInteractionType.create({
      data: {
        key: validated.key!,
        name: validated.name!,
        description: validated.description,
        supportsRoundRobin: validated.supportsRoundRobin,
        supportsMultipleHosts: validated.supportsMultipleHosts,
        minHosts: validated.minHosts,
        maxHosts: validated.maxHosts,
        minParticipants: validated.minParticipants,
        maxParticipants: validated.maxParticipants,
        supportsSimultaneousCoaches: validated.supportsSimultaneousCoaches,
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
        message: "An interaction type with this key already exists.",
      },
    });
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

  // Zod can handle partial updates, but we need to ensure refinements work on merged state
  const mergedPayload = { ...existing, ...payload };
  const validated = InteractionTypeSchema.body.parse(mergedPayload);

  // Strip non-Prisma fields and relationships
  const data: Prisma.EventInteractionTypeUpdateInput = {
    key: validated.key,
    name: validated.name,
    description: validated.description,
    supportsRoundRobin: validated.supportsRoundRobin,
    supportsMultipleHosts: validated.supportsMultipleHosts,
    minHosts: validated.minHosts,
    maxHosts: validated.maxHosts,
    minParticipants: validated.minParticipants,
    maxParticipants: validated.maxParticipants,
    supportsSimultaneousCoaches: validated.supportsSimultaneousCoaches,
    sortOrder: validated.sortOrder,
    isActive: validated.isActive,
    updatedBy: { connect: { id: caller.id } },
  };

  try {
    return await prisma.eventInteractionType.update({
      where: { id: interactionTypeId },
      data,
    });
  } catch (error) {
    return rethrowPrismaError(error, {
      P2002: {
        status: StatusCodes.CONFLICT,
        message: "An interaction type with this key already exists.",
      },
    });
  }
};

const getInteractionTypeUsage = async (
  interactionTypeId: string,
  _caller: CallerContext,
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
    return rethrowPrismaError(error, {
      P2025: {
        status: StatusCodes.NOT_FOUND,
        message: "Interaction type not found.",
      },
    });
  }
};

export {
  createEventOffering,
  listEventOfferings,
  updateEventOffering,
  deleteEventOffering,
  createInteractionType,
  listInteractionTypes,
  updateInteractionType,
  deleteInteractionType,
  getInteractionTypeUsage,
  getEventOfferingUsage,
};
