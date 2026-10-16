import { Prisma, UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import type { TxRunner } from "../../shared/db/transaction";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { rethrowPrismaError } from "../../shared/error/prismaError";
import { resolvePagination } from "../../shared/utils/pagination";
import { createPublicBookingSlug } from "../../shared/utils/publicBookingSlug";
import { getManagedTeam } from "../../shared/utils/teamAccess";
import type { CallerContext } from "../../shared/utils/userUtils";
import type { Team } from "@prisma/client";
import { CreateTeamSchema, UpdateTeamSchema, ListTeamsSchema } from "./team.schema";
import { getRequestLogger } from "../../shared/logging/requestContext";
import type { TeamRepository } from "./team.repository";

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

export const createTeamService = (teamRepo: TeamRepository, txRunner: TxRunner) => {
  const validateTeamLead = async (teamLeadId: string): Promise<void> => {
    const lead = await teamRepo.findUserRoleAndStatus(teamLeadId);

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

  const createTeam = async (payload: CreateTeamInput, caller: CallerContext): Promise<SafeTeam> => {
    const validated = await CreateTeamSchema.body.parseAsync(payload);

    await validateTeamLead(validated.teamLeadId);

    try {
      const team = await txRunner.run(async (tx) => {
        const newTeam = await teamRepo.create(
          {
            name: validated.name,
            publicBookingSlug: createPublicBookingSlug(validated.name, "team"),
            description: validated.description,
            teamLeadId: validated.teamLeadId,
            createdById: caller.id,
            isActive: validated.isActive ?? true,
          },
          tx,
        );

        await teamRepo.upsertLeadMembership(newTeam.id, validated.teamLeadId, tx);

        return newTeam;
      });

      getRequestLogger().info(
        { teamId: team.id, teamLeadId: validated.teamLeadId, createdBy: caller.id },
        "Team created.",
      );

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
    caller: CallerContext,
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

    const whereClause: Prisma.TeamWhereInput = { deletedAt: null };
    if (caller.role === UserRole.COACH) {
      whereClause.members = { some: { userId: caller.id, isActive: true } };
    } else if (caller.role === UserRole.TEAM_ADMIN) {
      whereClause.teamLeadId = caller.id;
    }

    const [teams, total] = await teamRepo.findManyWithCount({
      where: whereClause,
      skip,
      take: pageSize,
    });

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

  const readTeam = async (teamId: string, caller?: CallerContext): Promise<SafeTeam> => {
    if (caller) {
      await getManagedTeam(teamId, caller, { allowCoachMember: true, allowInactive: true });
    }

    const team = await teamRepo.findActiveWithLead(teamId);

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
      const team = await txRunner.run(async (tx) => {
        const updatedTeam = await teamRepo.update(teamId, updateData, tx);

        if (validated.teamLeadId !== undefined) {
          await teamRepo.upsertLeadMembership(updatedTeam.id, validated.teamLeadId, tx);
        }

        return updatedTeam;
      });

      if (validated.isActive !== undefined) {
        getRequestLogger().info(
          { teamId, isActive: validated.isActive },
          "Team active status changed.",
        );
      } else {
        getRequestLogger().info({ teamId }, "Team updated.");
      }

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
    const team = await teamRepo.findActive(teamId);

    if (!team) {
      throw new ErrorHandler(StatusCodes.NOT_FOUND, "Team not found.");
    }

    getRequestLogger().warn({ teamId }, "Team deleted.");

    await teamRepo.softDeleteWithChildren(teamId);

    return team;
  };

  return { createTeam, listTeams, readTeam, updateTeam, deleteTeam };
};

export type TeamService = ReturnType<typeof createTeamService>;
