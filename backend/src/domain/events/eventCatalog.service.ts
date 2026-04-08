import { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { rethrowPrismaError } from "../../shared/error/prismaError";
import type { CallerContext } from "../../shared/utils/userUtils";
import {
  assertCatalogManagementAllowed,
  normalizeKey,
  normalizeOptionalString,
  normalizeRequiredString,
  parseNonNegativeInt,
  parsePositiveInt,
  type SafeEventInteractionType,
  type SafeEventOffering,
  type UpsertEventOfferingInput,
  type UpsertInteractionTypeInput,
} from "./event.shared";

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

const validateInteractionTypePayload = (
  payload: UpsertInteractionTypeInput,
): {
  supportsRoundRobin: boolean;
  supportsMultipleHosts: boolean;
  minHosts: number;
  maxHosts: number | null;
  minParticipants: number;
  maxParticipants: number | null;
  supportsSimultaneousCoaches: boolean;
} => {
  const supportsRoundRobin = Boolean(payload.supportsRoundRobin);
  const supportsMultipleHosts = Boolean(payload.supportsMultipleHosts);
  const minHosts =
    payload.minHosts !== undefined ? parsePositiveInt(payload.minHosts, "minHosts") : 1;
  const maxHosts =
    payload.maxHosts === undefined || payload.maxHosts === null
      ? null
      : parsePositiveInt(payload.maxHosts, "maxHosts");
  const supportsSimultaneousCoaches = Boolean(payload.supportsSimultaneousCoaches);
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

  if (supportsSimultaneousCoaches && !supportsMultipleHosts) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "supportsSimultaneousCoaches requires supportsMultipleHosts to be true.",
    );
  }

  return {
    supportsRoundRobin,
    supportsMultipleHosts,
    minHosts,
    maxHosts,
    minParticipants,
    maxParticipants,
    supportsSimultaneousCoaches,
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
    supportsSimultaneousCoaches:
      payload.supportsSimultaneousCoaches ?? existing.supportsSimultaneousCoaches,
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
  createInteractionType,
  listInteractionTypes,
  updateInteractionType,
  deleteInteractionType,
  getInteractionTypeUsage,
};
