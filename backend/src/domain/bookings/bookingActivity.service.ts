import { BookingActivityType, BookingActivityActor, Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";

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
