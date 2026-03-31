import { Prisma, UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
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

const createTeam = async (
  payload: CreateTeamInput,
  caller: CallerContext,
): Promise<SafeTeam> => {
  const { name, description, teamLeadId } = payload;

  if (!name?.trim()) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Team name is required.");
  }
  if (!teamLeadId?.trim()) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "teamLeadId is required.");
  }

  await validateTeamLead(teamLeadId);

  try {
    const team = await prisma.$transaction(async (tx) => {
      const newTeam = await tx.team.create({
        data: {
          name: normalizeName(name),
          description: description?.trim() || null,
          teamLeadId,
          createdById: caller.id,
          isActive: payload.isActive ?? true,
        },
      });

      // Automatically add team lead as a member
      await tx.teamMember.create({
        data: {
          teamId: newTeam.id,
          userId: teamLeadId,
          isActive: true,
        },
      });

      return newTeam;
    });

    return team;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ErrorHandler(
        StatusCodes.CONFLICT,
        "A team with that name already exists.",
      );
    }
    throw error;
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
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 50));
  const skip = (page - 1) * pageSize;

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
  if (!teamId?.trim()) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "teamId is required.");
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
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
  if (!teamId?.trim()) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "teamId is required.");
  }

  const updateData: Prisma.TeamUpdateInput = {};

  if (payload.name !== undefined) {
    const value = payload.name.trim();
    if (!value) {
      throw new ErrorHandler(StatusCodes.BAD_REQUEST, "name cannot be empty.");
    }
    updateData.name = normalizeName(value);
  }

  if (payload.description !== undefined) {
    updateData.description = payload.description?.trim() || null;
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
        // Upsert team lead as member
        await tx.teamMember.upsert({
          where: {
            teamId_userId: {
              teamId: updatedTeam.id,
              userId: payload.teamLeadId,
            },
          },
          create: {
            teamId: updatedTeam.id,
            userId: payload.teamLeadId,
            isActive: true,
          },
          update: {
            isActive: true, // Reactivate if they were inactive
          },
        });
      }

      return updatedTeam;
    });

    return team;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new ErrorHandler(StatusCodes.NOT_FOUND, "Team not found.");
      }
      if (error.code === "P2002") {
        throw new ErrorHandler(
          StatusCodes.CONFLICT,
          "A team with that name already exists.",
        );
      }
    }
    throw error;
  }
};

const deleteTeam = async (teamId: string): Promise<SafeTeam> => {
  if (!teamId?.trim()) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "teamId is required.");
  }

  try {
    const team = await prisma.team.delete({
      where: { id: teamId },
    });
    return team;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new ErrorHandler(StatusCodes.NOT_FOUND, "Team not found.");
    }
    throw error;
  }
};

export { createTeam, listTeams, readTeam, updateTeam, deleteTeam };
