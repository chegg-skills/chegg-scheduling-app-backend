import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { rethrowPrismaError } from "../../shared/error/prismaError";
import { getManagedTeam } from "../../shared/utils/teamAccess";
import type { CallerContext } from "../../shared/utils/userUtils";
import {
  eventGroupInclude,
  type CreateEventGroupInput,
  type SafeEventGroup,
  type UpdateEventGroupInput,
} from "./eventGroup.shared";

const DUPLICATE_NAME_MESSAGE = "A group with that name already exists in this team.";

const loadGroupOrThrow = async (groupId: string): Promise<SafeEventGroup> => {
  const group = await prisma.eventGroup.findUnique({
    where: { id: groupId },
    include: eventGroupInclude,
  });

  if (!group) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Event group not found.");
  }

  return group;
};

const createEventGroup = async (
  teamId: string,
  payload: CreateEventGroupInput,
  caller: CallerContext,
): Promise<SafeEventGroup> => {
  await getManagedTeam(teamId, caller, { allowInactive: true });

  try {
    return await prisma.eventGroup.create({
      data: {
        teamId,
        name: payload.name,
        description: payload.description ?? null,
        color: payload.color ?? null,
        createdById: caller.id,
      },
      include: eventGroupInclude,
    });
  } catch (error) {
    return rethrowPrismaError(error, {
      P2002: { status: StatusCodes.CONFLICT, message: DUPLICATE_NAME_MESSAGE },
    });
  }
};

const listTeamEventGroups = async (
  teamId: string,
  caller: CallerContext,
): Promise<SafeEventGroup[]> => {
  await getManagedTeam(teamId, caller, { allowInactive: true });

  return prisma.eventGroup.findMany({
    where: { teamId },
    orderBy: { name: "asc" },
    include: eventGroupInclude,
  });
};

const readEventGroup = async (groupId: string, caller: CallerContext): Promise<SafeEventGroup> => {
  const group = await loadGroupOrThrow(groupId);
  await getManagedTeam(group.teamId, caller, { allowInactive: true });
  return group;
};

const updateEventGroup = async (
  groupId: string,
  payload: UpdateEventGroupInput,
  caller: CallerContext,
): Promise<SafeEventGroup> => {
  const existing = await loadGroupOrThrow(groupId);
  await getManagedTeam(existing.teamId, caller, { allowInactive: true });

  const data: Record<string, unknown> = {};
  if (payload.name !== undefined) data.name = payload.name;
  if (payload.description !== undefined) data.description = payload.description;
  if (payload.color !== undefined) data.color = payload.color;

  try {
    return await prisma.eventGroup.update({
      where: { id: groupId },
      data,
      include: eventGroupInclude,
    });
  } catch (error) {
    return rethrowPrismaError(error, {
      P2002: { status: StatusCodes.CONFLICT, message: DUPLICATE_NAME_MESSAGE },
      P2025: { status: StatusCodes.NOT_FOUND, message: "Event group not found." },
    });
  }
};

const deleteEventGroup = async (groupId: string, caller: CallerContext): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    const group = await tx.eventGroup.findUnique({
      where: { id: groupId },
      include: { _count: { select: { events: true } } },
    });

    if (!group) {
      throw new ErrorHandler(StatusCodes.NOT_FOUND, "Event group not found.");
    }

    await getManagedTeam(group.teamId, caller, { allowInactive: true });

    if (group._count.events > 0) {
      throw new ErrorHandler(
        StatusCodes.CONFLICT,
        `Cannot delete group because it still contains ${group._count.events} event(s). Move them to another group (or remove them from this one) first.`,
      );
    }

    await tx.eventGroup.delete({ where: { id: groupId } });
  });
};

export {
  createEventGroup,
  listTeamEventGroups,
  readEventGroup,
  updateEventGroup,
  deleteEventGroup,
};
