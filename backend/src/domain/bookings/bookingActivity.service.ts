import { BookingActivityType, BookingActivityActor, UserRole, Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import type { CallerContext } from "../../shared/utils/userUtils";

/**
 * Records a booking activity log.
 * @param tx Prisma transaction client or main prisma client instance
 * @param bookingId Target booking ID
 * @param activityType Type of the activity event
 * @param actorType The role category of the initiator
 * @param actorUserId User ID if the actor is an admin/coach
 * @param actorName Name of the actor (optional, resolved from user ID if absent)
 * @param metadata Extra structural metadata payload
 */
export const recordBookingActivity = async (
  tx: Prisma.TransactionClient,
  bookingId: string,
  activityType: BookingActivityType,
  actorType: BookingActivityActor,
  actorUserId?: string | null,
  actorName?: string | null,
  metadata?: Prisma.InputJsonValue,
) => {
  let resolvedActorName = actorName;
  if (!resolvedActorName && actorUserId) {
    const user = await tx.user.findUnique({
      where: { id: actorUserId },
      select: { firstName: true, lastName: true },
    });
    if (user) {
      resolvedActorName = `${user.firstName} ${user.lastName}`.trim();
    }
  }

  return tx.bookingActivity.create({
    data: {
      bookingId,
      activityType,
      actorType,
      actorUserId: actorUserId ?? null,
      actorName: resolvedActorName ?? null,
      metadata: metadata ?? undefined,
    },
  });
};

/**
 * Enforces timeline access control.
 * - SUPER_ADMIN: unrestricted
 * - TEAM_ADMIN: must be the team lead of the booking's team
 * - COACH: must be the lead or a co-host on the booking
 */
export const assertBookingTimelineAccess = async (
  booking: { coachUserId: string | null; coCoachUserIds: string[]; teamId: string },
  caller: CallerContext,
): Promise<void> => {
  if (caller.role === UserRole.SUPER_ADMIN) return;

  if (caller.role === UserRole.COACH) {
    const isLead = booking.coachUserId != null && booking.coachUserId === caller.id;
    const isCoHost = (booking.coCoachUserIds ?? []).includes(caller.id);
    if (!isLead && !isCoHost) {
      throw new ErrorHandler(StatusCodes.FORBIDDEN, "You are not authorized to view this booking timeline.");
    }
    return;
  }

  if (caller.role === UserRole.TEAM_ADMIN) {
    const isTeamLead = await prisma.team.findFirst({
      where: { id: booking.teamId, teamLeadId: caller.id },
      select: { id: true },
    });
    if (!isTeamLead) {
      throw new ErrorHandler(StatusCodes.FORBIDDEN, "You are not authorized to view this booking timeline.");
    }
    return;
  }

  throw new ErrorHandler(StatusCodes.FORBIDDEN, "You are not authorized to view this booking timeline.");
};

/**
 * Fetches booking activities, ordered descending by timestamp.
 */
export const getBookingActivities = async (
  bookingId: string,
  page = 1,
  limit = 20,
) => {
  const skip = (page - 1) * limit;

  const [activities, totalCount] = await Promise.all([
    prisma.bookingActivity.findMany({
      where: { bookingId },
      orderBy: { timestamp: "desc" },
      skip,
      take: limit,
      include: {
        actorUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    }),
    prisma.bookingActivity.count({
      where: { bookingId },
    }),
  ]);

  return { activities, totalCount };
};
