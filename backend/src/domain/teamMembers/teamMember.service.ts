import { UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { getManagedTeam } from "../../shared/utils/teamAccess";
import type { CallerContext } from "../../shared/utils/userUtils";
import { queueTeamMemberAddedNotification } from "./teamMember.notification";
import { getRequestLogger } from "../../shared/logging/requestContext";
import type { TeamMemberRepository } from "./teamMember.repository";
import type { SafeTeamMember } from "./teamMember.shared";

export type { SafeTeamMember };

type CreateTeamMemberInput = {
  userId: string;
};

export const createTeamMemberService = (teamMemberRepo: TeamMemberRepository) => {
  const validateAssignableUser = async (userId: string) => {
    const user = await teamMemberRepo.findUserForAssignment(userId);

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

      const existingMembership = await teamMemberRepo.findMembership(teamId, userId);

      if (existingMembership?.isActive) {
        results.push(existingMembership);
        continue;
      }

      let member: SafeTeamMember;
      if (existingMembership) {
        member = await teamMemberRepo.setActive(existingMembership.id, true);
        getRequestLogger().info({ teamId, userId, addedBy: caller.id }, "Team member reactivated.");
        void queueTeamMemberAddedNotification({ teamId, userId });
      } else {
        member = await teamMemberRepo.create(teamId, userId);
        getRequestLogger().info({ teamId, userId, addedBy: caller.id }, "Team member added.");
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
    await getManagedTeam(teamId, caller, {
      allowInactive: true,
      allowCoachMember: caller.role === UserRole.COACH,
    });

    const members = await teamMemberRepo.listActive(teamId);

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

    const membership = await teamMemberRepo.findMembership(teamId, userId);

    if (!membership) {
      throw new ErrorHandler(StatusCodes.NOT_FOUND, "Team member not found.");
    }

    if (!membership.isActive) {
      throw new ErrorHandler(StatusCodes.CONFLICT, "This team membership is already inactive.");
    }

    const team = await teamMemberRepo.findTeamLeadId(teamId);

    if (team?.teamLeadId === userId) {
      throw new ErrorHandler(
        StatusCodes.CONFLICT,
        "Cannot remove the Team Lead from the team. Please assign a new Team Lead in Team Settings first.",
      );
    }

    const activeHostAssignments = await teamMemberRepo.countActiveHostAssignments(userId, teamId);

    if (activeHostAssignments > 0) {
      throw new ErrorHandler(
        StatusCodes.FORBIDDEN,
        "Remove this user from the team's events before removing team membership.",
      );
    }

    const removed = await teamMemberRepo.setActive(membership.id, false);

    getRequestLogger().info({ teamId, userId, removedBy: caller.id }, "Team member removed.");

    return removed;
  };

  const getTeamMemberWorkload = async (
    teamId: string,
    caller: CallerContext,
  ): Promise<{ userId: string; sessionCount: number }[]> => {
    await getManagedTeam(teamId, caller, { allowInactive: true, allowCoachMember: true });
    const now = new Date();

    // Individual sessions from COACH_AVAILABILITY events (each booking = one private session)
    const bookingCounts = await teamMemberRepo.groupUpcomingBookingCounts(teamId, now);

    // Group sessions from FIXED_SLOTS events (each slot = one group session)
    const slotCounts = await teamMemberRepo.groupUpcomingSlotCounts(teamId, now);

    const sessionMap = new Map<string, number>();
    for (const r of bookingCounts) {
      if (r.coachUserId)
        sessionMap.set(r.coachUserId, (sessionMap.get(r.coachUserId) ?? 0) + r._count.coachUserId);
    }
    for (const r of slotCounts) {
      if (r.assignedCoachId)
        sessionMap.set(
          r.assignedCoachId,
          (sessionMap.get(r.assignedCoachId) ?? 0) + r._count.assignedCoachId,
        );
    }

    return [...sessionMap.entries()].map(([userId, sessionCount]) => ({ userId, sessionCount }));
  };

  return {
    addTeamMember,
    addTeamMembers,
    listTeamMembers,
    removeTeamMember,
    getTeamMemberWorkload,
  };
};

export type TeamMemberService = ReturnType<typeof createTeamMemberService>;
