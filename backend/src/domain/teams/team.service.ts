import { Prisma, UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { rethrowPrismaError } from "../../shared/error/prismaError";
import { resolvePagination } from "../../shared/utils/pagination";
import { createPublicBookingSlug } from "../../shared/utils/publicBookingSlug";
import {
  normalizeOptionalString,
  requireEntityId,
  requireTrimmedString,
} from "../../shared/utils/validation";
import type { CallerContext } from "../../shared/utils/userUtils";
import type { Team } from "@prisma/client";

export type SafeTeam = Team;

type ListTeamsOptions = {
  page?: number;
  pageSize?: number;
};

type CreateTeamInput = {
  name: string;
  description?: string;
  teamLeadId: string;
  isActive?: boolean;
};

type UpdateTeamInput = {
  name?: string;
  description?: string;
  teamLeadId?: string;
  isActive?: boolean;
};

const normalizeName = (name: string): string => name.trim().toLowerCase();

const requireTeamId = (teamId: string): string =>
  requireEntityId(teamId, "teamId");

const requireTeamName = (name: string): string =>
  requireTrimmedString(name, "name", "Team name is required.");

const normalizeDescription = (description?: string): string | null =>
  normalizeOptionalString(description, "description");

const validateTeamLead = async (teamLeadId: string): Promise<void> => {
  const lead = await prisma.user.findUnique({
    where: { id: teamLeadId },
    select: { role: true, isActive: true },
  });

  if (!lead) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "Team lead user not found.",
    );
  }
  if (!lead.isActive) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "Team lead must be an active user.",
    );
  }
  if (lead.role !== UserRole.TEAM_ADMIN) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "Team lead must have the TEAM_ADMIN role.",
    );
  }
};

const upsertTeamLeadMembership = async (
  tx: Prisma.TransactionClient,
  teamId: string,
  teamLeadId: string,
): Promise<void> => {
  await tx.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId,
        userId: teamLeadId,
      },
    },
    create: {
      teamId,
      userId: teamLeadId,
      isActive: true,
    },
    update: {
      isActive: true,
    },
  });
};

const createTeam = async (
  payload: CreateTeamInput,
  caller: CallerContext,
): Promise<SafeTeam> => {
  const name = requireTeamName(payload.name);
  const teamLeadId = payload.teamLeadId?.trim();

  if (!teamLeadId) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "teamLeadId is required.");
  }

  await validateTeamLead(teamLeadId);

  try {
    const team = await prisma.$transaction(async (tx) => {
      const newTeam = await tx.team.create({
        data: {
          name: normalizeName(name),
          publicBookingSlug: createPublicBookingSlug(name, "team"),
          description: normalizeDescription(payload.description),
          teamLeadId,
          createdById: caller.id,
          isActive: payload.isActive ?? true,
        },
      });

      await upsertTeamLeadMembership(tx, newTeam.id, teamLeadId);

      return newTeam;
    });

    return team;
  } catch (error) {
    return rethrowPrismaError(error, {
      P2002: {
        status: StatusCodes.CONFLICT,
        message: "A team with that name already exists.",
      },
    });
  }
};

const listTeams = async (
  options: ListTeamsOptions = {},
): Promise<{
  teams: SafeTeam[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}> => {
  const { page, pageSize, skip } = resolvePagination(options);

  const [teams, total] = await prisma.$transaction([
    prisma.team.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.team.count(),
  ]);

  return {
    teams,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

const readTeam = async (teamId: string): Promise<SafeTeam> => {
  const normalizedTeamId = requireTeamId(teamId);

  const team = await prisma.team.findUnique({
    where: { id: normalizedTeamId },
  });

  if (!team) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Team not found.");
  }

  return team;
};

const updateTeam = async (
  teamId: string,
  payload: UpdateTeamInput,
): Promise<SafeTeam> => {
  teamId = requireTeamId(teamId);
  const existingTeam = await readTeam(teamId);

  const updateData: Prisma.TeamUpdateInput = {};

  if (payload.name !== undefined) {
    const value = requireTeamName(payload.name);
    updateData.name = normalizeName(value);

    if (!existingTeam.publicBookingSlug) {
      updateData.publicBookingSlug = createPublicBookingSlug(value, "team");
    }
  }

  if (payload.description !== undefined) {
    updateData.description = normalizeDescription(payload.description);
  }

  if (payload.teamLeadId !== undefined) {
    const value = payload.teamLeadId.trim();
    if (!value) {
      throw new ErrorHandler(
        StatusCodes.BAD_REQUEST,
        "teamLeadId cannot be empty.",
      );
    }
    await validateTeamLead(value);
    updateData.teamLead = { connect: { id: value } };
  }

  if (payload.isActive !== undefined) {
    updateData.isActive = payload.isActive;
  }

  try {
    const team = await prisma.$transaction(async (tx) => {
      const updatedTeam = await tx.team.update({
        where: { id: teamId },
        data: updateData,
      });

      if (payload.teamLeadId !== undefined) {
        await upsertTeamLeadMembership(tx, updatedTeam.id, payload.teamLeadId);
      }

      return updatedTeam;
    });

    return team;
  } catch (error) {
    return rethrowPrismaError(error, {
      P2025: { status: StatusCodes.NOT_FOUND, message: "Team not found." },
      P2002: {
        status: StatusCodes.CONFLICT,
        message: "A team with that name already exists.",
      },
    });
  }
};

const deleteTeam = async (teamId: string): Promise<SafeTeam> => {
  teamId = requireTeamId(teamId);

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      _count: {
        select: { bookings: true },
      },
    },
  });

  if (!team) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Team not found.");
  }

  if (team._count.bookings > 0) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      `Cannot delete team because it has ${team._count.bookings} booking(s). Please deactivate it instead to preserve historical data.`,
    );
  }

  try {
    return await prisma.team.delete({
      where: { id: teamId },
    });
  } catch (error) {
    return rethrowPrismaError(error, {
      P2025: { status: StatusCodes.NOT_FOUND, message: "Team not found." },
    });
  }
};

export { createTeam, listTeams, readTeam, updateTeam, deleteTeam };
