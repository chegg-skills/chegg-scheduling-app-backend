import { Prisma, UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { getManagedTeam } from "../../shared/utils/teamAccess";
import { safeUserSelect, type CallerContext } from "../../shared/utils/userUtils";
import { queueTeamMemberAddedNotification } from "./teamMember.notification";

const teamMemberInclude = Prisma.validator<Prisma.TeamMemberInclude>()({
  user: { select: safeUserSelect },
});

type SafeTeamMember = Prisma.TeamMemberGetPayload<{
  include: typeof teamMemberInclude;
}>;

type CreateTeamMemberInput = {
  userId: string;
};

const validateAssignableUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });

  if (!user) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "User not found.");
  }

  if (!user.isActive) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Only active users can be added to a team.");
  }

  if (user.role === UserRole.SUPER_ADMIN) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "SUPER_ADMIN users cannot be added as team members.",
    );
  }

  return user;
};

const addTeamMember = async (
  teamId: string,
  payload: CreateTeamMemberInput,
  caller: CallerContext,
): Promise<SafeTeamMember> => {
  const result = await addTeamMembers(teamId, { userIds: [payload.userId] }, caller);
  return result[0];
};

const addTeamMembers = async (
  teamId: string,
  payload: { userIds: string[] },
  caller: CallerContext,
): Promise<SafeTeamMember[]> => {
  await getManagedTeam(teamId, caller);

  const { userIds } = payload;
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "userIds array is required.");
  }

  const results: SafeTeamMember[] = [];

  for (const rawId of userIds) {
    const userId = rawId.trim();
    if (!userId) continue;

    await validateAssignableUser(userId);

    const existingMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
      include: teamMemberInclude,
    });

    if (existingMembership?.isActive) {
      // Skip if already active, or we could collect these as errors?
      // For bulk, let's just skip or return the existing one.
      results.push(existingMembership);
      continue;
    }

    let member: SafeTeamMember;
    if (existingMembership) {
      member = await prisma.teamMember.update({
        where: { id: existingMembership.id },
        data: { isActive: true },
        include: teamMemberInclude,
      });

      void queueTeamMemberAddedNotification({ teamId, userId });
    } else {
      member = await prisma.teamMember.create({
        data: {
          teamId,
          userId,
        },
        include: teamMemberInclude,
      });

      void queueTeamMemberAddedNotification({ teamId, userId });
    }
    results.push(member);
  }

  return results;
};

const listTeamMembers = async (
  teamId: string,
  caller: CallerContext,
): Promise<{ members: SafeTeamMember[] }> => {
  await getManagedTeam(teamId, caller, { allowInactive: true });

  const members = await prisma.teamMember.findMany({
    where: { teamId, isActive: true },
    include: teamMemberInclude,
    orderBy: [{ createdAt: "desc" }],
  });

  return { members };
};

const removeTeamMember = async (
  teamId: string,
  userId: string,
  caller: CallerContext,
): Promise<SafeTeamMember> => {
  await getManagedTeam(teamId, caller);

  if (!userId?.trim()) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "userId is required.");
  }

  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId,
      },
    },
    include: teamMemberInclude,
  });

  if (!membership) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Team member not found.");
  }

  if (!membership.isActive) {
    throw new ErrorHandler(StatusCodes.CONFLICT, "This team membership is already inactive.");
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { teamLeadId: true },
  });

  if (team?.teamLeadId === userId) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      "Cannot remove the Team Lead from the team. Please assign a new Team Lead in Team Settings first.",
    );
  }

  const activeHostAssignments = await prisma.eventHost.count({
    where: {
      hostUserId: userId,
      isActive: true,
      event: {
        teamId,
        isActive: true,
      },
    },
  });

  if (activeHostAssignments > 0) {
    throw new ErrorHandler(
      StatusCodes.FORBIDDEN,
      "Remove this user from the team's events before removing team membership.",
    );
  }

  return prisma.teamMember.update({
    where: { id: membership.id },
    data: { isActive: false },
    include: teamMemberInclude,
  });
};

export { addTeamMember, addTeamMembers, listTeamMembers, removeTeamMember, type SafeTeamMember };
