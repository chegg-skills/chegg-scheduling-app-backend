import { EventBookingMode, type UserRole } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import type { DbClient } from "../../shared/db/repository";
import { teamMemberInclude, type SafeTeamMember } from "./teamMember.shared";

export type AssignableUser = { id: string; role: UserRole; isActive: boolean };

export interface TeamMemberRepository {
  findUserForAssignment(userId: string, tx?: DbClient): Promise<AssignableUser | null>;
  findMembership(teamId: string, userId: string, tx?: DbClient): Promise<SafeTeamMember | null>;
  create(teamId: string, userId: string, tx?: DbClient): Promise<SafeTeamMember>;
  setActive(id: string, isActive: boolean, tx?: DbClient): Promise<SafeTeamMember>;
  listActive(teamId: string, tx?: DbClient): Promise<SafeTeamMember[]>;
  findTeamLeadId(teamId: string, tx?: DbClient): Promise<{ teamLeadId: string } | null>;
  countActiveHostAssignments(userId: string, teamId: string, tx?: DbClient): Promise<number>;
  /** Upcoming, non-cancelled individual (COACH_AVAILABILITY) bookings per coach. */
  groupUpcomingBookingCounts(
    teamId: string,
    now: Date,
    tx?: DbClient,
  ): Promise<Array<{ coachUserId: string | null; _count: { coachUserId: number } }>>;
  /** Upcoming, active, non-cancelled group slots per assigned coach. */
  groupUpcomingSlotCounts(
    teamId: string,
    now: Date,
    tx?: DbClient,
  ): Promise<Array<{ assignedCoachId: string | null; _count: { assignedCoachId: number } }>>;
}

export const createTeamMemberRepo = (db: DbClient = prisma): TeamMemberRepository => ({
  findUserForAssignment: (userId, tx) =>
    (tx ?? db).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        isActive: true,
      },
    }),

  findMembership: (teamId, userId, tx) =>
    (tx ?? db).teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
      include: teamMemberInclude,
    }),

  create: (teamId, userId, tx) =>
    (tx ?? db).teamMember.create({
      data: { teamId, userId },
      include: teamMemberInclude,
    }),

  setActive: (id, isActive, tx) =>
    (tx ?? db).teamMember.update({
      where: { id },
      data: { isActive },
      include: teamMemberInclude,
    }),

  listActive: (teamId, tx) =>
    (tx ?? db).teamMember.findMany({
      where: { teamId, isActive: true },
      include: teamMemberInclude,
      orderBy: [{ createdAt: "desc" }],
    }),

  findTeamLeadId: (teamId, tx) =>
    (tx ?? db).team.findUnique({
      where: { id: teamId },
      select: { teamLeadId: true },
    }),

  countActiveHostAssignments: (userId, teamId, tx) =>
    (tx ?? db).eventCoach.count({
      where: {
        coachUserId: userId,
        isActive: true,
        event: {
          teamId,
          isActive: true,
        },
      },
    }),

  groupUpcomingBookingCounts: async (teamId, now, tx) => {
    const rows = await (tx ?? db).booking.groupBy({
      by: ["coachUserId"],
      where: {
        teamId,
        status: { not: "CANCELLED" },
        startTime: { gte: now },
        event: { bookingMode: EventBookingMode.COACH_AVAILABILITY },
      },
      _count: { coachUserId: true },
    });
    return rows;
  },

  groupUpcomingSlotCounts: async (teamId, now, tx) => {
    const rows = await (tx ?? db).eventScheduleSlot.groupBy({
      by: ["assignedCoachId"],
      where: {
        event: { teamId },
        isActive: true,
        isCancelled: false,
        startTime: { gte: now },
      },
      _count: { assignedCoachId: true },
    });
    return rows;
  },
});
