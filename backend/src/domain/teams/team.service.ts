import { Prisma, UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { rethrowPrismaError } from "../../shared/error/prismaError";
import { resolvePagination } from "../../shared/utils/pagination";
import { createPublicBookingSlug } from "../../shared/utils/publicBookingSlug";
import type { CallerContext } from "../../shared/utils/userUtils";
import type { Team } from "@prisma/client";
import { CreateTeamSchema, UpdateTeamSchema, ListTeamsSchema } from "./team.schema";

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

const validateTeamLead = async (teamLeadId: string): Promise<void> => {
  const lead = await prisma.user.findUnique({
    where: { id: teamLeadId },
    select: { role: true, isActive: true },
  });

  if (!lead) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Team lead user not found.");
  }
  if (!lead.isActive) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Team lead must be an active user.");
  }
  if (lead.role !== UserRole.TEAM_ADMIN) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Team lead must have the TEAM_ADMIN role.");
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

const createTeam = async (payload: CreateTeamInput, caller: CallerContext): Promise<SafeTeam> => {
  const validated = await CreateTeamSchema.body.parseAsync(payload);

  await validateTeamLead(validated.teamLeadId);

  try {
    const team = await prisma.$transaction(async (tx) => {
      const newTeam = await tx.team.create({
        data: {
          name: validated.name,
          publicBookingSlug: createPublicBookingSlug(validated.name, "team"),
          description: validated.description,
          teamLeadId: validated.teamLeadId,
          createdById: caller.id,
          isActive: validated.isActive ?? true,
        },
      });

      await upsertTeamLeadMembership(tx, newTeam.id, validated.teamLeadId);

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
  const validatedOptions = ListTeamsSchema.query.parse(options);
  const { page, pageSize, skip } = resolvePagination(validatedOptions);

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
  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Team not found.");
  }

  return team;
};

const updateTeam = async (teamId: string, payload: UpdateTeamInput): Promise<SafeTeam> => {
  const validated = await UpdateTeamSchema.body.parseAsync(payload);
  const existingTeam = await readTeam(teamId);

  const updateData: Prisma.TeamUpdateInput = {};

  if (validated.name !== undefined) {
    updateData.name = validated.name;
    if (!existingTeam.publicBookingSlug) {
      updateData.publicBookingSlug = createPublicBookingSlug(validated.name, "team");
    }
  }

  if (validated.description !== undefined) {
    updateData.description = validated.description;
  }

  if (validated.teamLeadId !== undefined) {
    await validateTeamLead(validated.teamLeadId);
    updateData.teamLead = { connect: { id: validated.teamLeadId } };
  }

  if (validated.isActive !== undefined) {
    updateData.isActive = validated.isActive;
  }

  try {
    const team = await prisma.$transaction(async (tx) => {
      const updatedTeam = await tx.team.update({
        where: { id: teamId },
        data: updateData,
      });

      if (validated.teamLeadId !== undefined) {
        await upsertTeamLeadMembership(tx, updatedTeam.id, validated.teamLeadId);
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
