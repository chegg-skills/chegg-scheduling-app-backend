import { UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../db/prisma";
import { ErrorHandler } from "../error/errorhandler";
import type { CallerContext } from "./userUtils";

type TeamAccessOptions = {
  allowInactive?: boolean;
  allowCoachMember?: boolean;
};

type AccessibleTeam = {
  id: string;
  teamLeadId: string;
  isActive: boolean;
};

const getManagedTeam = async (
  teamId: string,
  caller: CallerContext,
  options: TeamAccessOptions = {},
): Promise<AccessibleTeam> => {
  if (!teamId?.trim()) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "teamId is required.");
  }

  const team = await prisma.team.findFirst({
    where: { id: teamId, deletedAt: null },
    select: { id: true, teamLeadId: true, isActive: true },
  });

  if (!team) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Team not found.");
  }

  if (caller.role === UserRole.COACH && options.allowCoachMember) {
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: team.id,
          userId: caller.id,
        },
      },
    });

    if (!membership || !membership.isActive) {
      throw new ErrorHandler(
        StatusCodes.FORBIDDEN,
        "You do not have permission to access this team.",
      );
    }
  } else {
    if (caller.role === UserRole.TEAM_ADMIN && team.teamLeadId !== caller.id) {
      throw new ErrorHandler(
        StatusCodes.FORBIDDEN,
        "You do not have permission to manage this team.",
      );
    }

    if (caller.role !== UserRole.SUPER_ADMIN && caller.role !== UserRole.TEAM_ADMIN) {
      throw new ErrorHandler(
        StatusCodes.FORBIDDEN,
        "You do not have permission to manage this team.",
      );
    }
  }

  if (options.allowInactive === false && !team.isActive) {
    throw new ErrorHandler(StatusCodes.CONFLICT, "This team is inactive.");
  }

  return team;
};

export { getManagedTeam, type AccessibleTeam };
