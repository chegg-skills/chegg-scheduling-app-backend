import { AssignmentStrategy, EventBookingMode, Prisma, SessionLeadershipStrategy, UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { getRequestLogger } from "../../shared/logging/requestContext";
import type { CallerContext } from "../../shared/utils/userUtils";
import {
  INTERACTION_TYPE_CAPS,
  type InteractionType,
} from "../../shared/constants/interactionType";
import { eventInclude, getManagedEvent, type SafeEvent } from "./event.shared";
import { queueEventCoachAddedNotification } from "./eventCoach.notification";
import { ReplaceEventCoachesSchema } from "./event.schema";
import {
  getEventCoachWeeklyAvailability,
  setEventCoachWeeklyAvailability,
} from "../availability/availabilityCalendar.service";

type EventConfigValidationInput = {
  interactionType: InteractionType;
  assignmentStrategy: AssignmentStrategy;
  coachCount: number;
  sessionLeadershipStrategy?: SessionLeadershipStrategy;
  fixedLeadCoachId?: string | null;
  coachUserIds?: string[];
};

const validateEventConfiguration = (input: EventConfigValidationInput): void => {
  const caps = INTERACTION_TYPE_CAPS[input.interactionType];

  // ROUND_ROBIN is valid for all interaction types — multipleCoaches only means
  // "multiple coaches simultaneously in one session", not that the pool is restricted
  // to a single coach. ONE_TO_ONE / ONE_TO_MANY events can round-robin across a pool.

  if (
    input.sessionLeadershipStrategy &&
    input.sessionLeadershipStrategy !== SessionLeadershipStrategy.SINGLE_COACH &&
    !caps.multipleCoaches
  ) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "This interaction type does not support simultaneous co-hosting.",
    );
  }

  if (
    input.sessionLeadershipStrategy === SessionLeadershipStrategy.FIXED_LEAD &&
    !input.fixedLeadCoachId
  ) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "FIXED_LEAD events require a fixedLeadCoachId.",
    );
  }

  if (
    input.sessionLeadershipStrategy === SessionLeadershipStrategy.FIXED_LEAD &&
    input.fixedLeadCoachId &&
    input.coachUserIds?.length &&
    !input.coachUserIds.includes(input.fixedLeadCoachId)
  ) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "The fixed lead coach must be one of the event's assigned coaches.",
    );
  }

  if (
    input.assignmentStrategy === AssignmentStrategy.ROUND_ROBIN &&
    input.coachCount > 0 &&
    input.coachCount < 2
  ) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "Round-robin requires at least 2 coaches. Add another coach first, then remove this one.",
    );
  }
};

const normalizeCoachInputs = (payload: unknown): Array<{ userId: string; coachOrder: number }> => {
  const validated = ReplaceEventCoachesSchema.body.parse(payload);

  const withOrder = validated.coaches.map((coach, index) => ({
    userId: coach.userId,
    coachOrder: coach.coachOrder ?? index + 1,
  }));

  const uniqueUserIds = new Set(withOrder.map((c) => c.userId));
  if (uniqueUserIds.size !== withOrder.length) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Each coach userId must be unique.");
  }

  return withOrder
    .sort((a, b) => a.coachOrder - b.coachOrder)
    .map((coach, index) => ({
      userId: coach.userId,
      coachOrder: index + 1,
    }));
};

const validateEventCoaches = async (
  teamId: string,
  event: {
    interactionType: InteractionType;
    assignmentStrategy: AssignmentStrategy;
  },
  coaches: Array<{ userId: string; coachOrder: number }>,
): Promise<void> => {
  validateEventConfiguration({
    interactionType: event.interactionType,
    assignmentStrategy: event.assignmentStrategy,
    coachCount: coaches.length,
  });

  if (coaches.length === 0) {
    return;
  }

  const userIds = coaches.map((c) => c.userId);
  const [users, memberships] = await prisma.$transaction([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, role: true, isActive: true },
    }),
    prisma.teamMember.findMany({
      where: {
        teamId,
        isActive: true,
        userId: { in: userIds },
      },
      select: { userId: true },
    }),
  ]);

  if (users.length !== userIds.length) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "One or more selected coaches do not exist.");
  }

  const membershipIds = new Set(memberships.map((m) => m.userId));
  for (const user of users) {
    if (!user.isActive) {
      throw new ErrorHandler(
        StatusCodes.BAD_REQUEST,
        "Only active users can be assigned to an event.",
      );
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ErrorHandler(
        StatusCodes.BAD_REQUEST,
        "SUPER_ADMIN users cannot be assigned as event coaches.",
      );
    }

    if (!membershipIds.has(user.id)) {
      throw new ErrorHandler(
        StatusCodes.BAD_REQUEST,
        "All coaches must be active members of the event's team.",
      );
    }
  }
};

const syncRoutingState = async (
  tx: Prisma.TransactionClient,
  eventId: string,
  assignmentStrategy: AssignmentStrategy,
  coachCount: number,
): Promise<void> => {
  if (assignmentStrategy === AssignmentStrategy.ROUND_ROBIN && coachCount > 0) {
    await tx.eventRoutingState.upsert({
      where: { eventId },
      update: { nextCoachOrder: 1 },
      create: { eventId, nextCoachOrder: 1 },
    });
    return;
  }

  await tx.eventRoutingState.deleteMany({ where: { eventId } });
};

const listEventCoaches = async (
  eventId: string,
  caller: CallerContext,
): Promise<{ coaches: SafeEvent["coaches"] }> => {
  const event = await getManagedEvent(eventId, caller, { allowCoachMember: true });
  return { coaches: event.coaches };
};

const replaceEventCoaches = async (
  eventId: string,
  payload: unknown,
  caller: CallerContext,
): Promise<{ coaches: SafeEvent["coaches"] }> => {
  const event = await getManagedEvent(eventId, caller);
  const normalizedCoaches = normalizeCoachInputs(payload);

  if (event.assignmentStrategy === AssignmentStrategy.ROUND_ROBIN && normalizedCoaches.length < 2) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "Round-robin requires at least 2 coaches. Add another coach first, then remove this one.",
    );
  }

  const existingCoachUserIds = new Set(event.coaches.map((c) => c.coachUserId));
  const newlyAddedCoachUserIds = normalizedCoaches
    .map((c) => c.userId)
    .filter((userId) => !existingCoachUserIds.has(userId));

  await validateEventCoaches(event.teamId, event, normalizedCoaches);

  await prisma.$transaction(async (tx) => {
    const existingOverrides = await tx.eventCoachWeeklyAvailability.findMany({
      where: { eventId },
    });

    await tx.eventCoach.deleteMany({ where: { eventId } });

    if (normalizedCoaches.length > 0) {
      await tx.eventCoach.createMany({
        data: normalizedCoaches.map((coach) => ({
          eventId,
          coachUserId: coach.userId,
          coachOrder: coach.coachOrder,
        })),
      });
    }

    const retainedCoachIds = new Set(normalizedCoaches.map((c) => c.userId));
    const overridesToRestore = existingOverrides.filter((o) => retainedCoachIds.has(o.coachUserId));
    if (overridesToRestore.length > 0) {
      await tx.eventCoachWeeklyAvailability.createMany({
        data: overridesToRestore.map(({ id: _id, createdAt: _c, updatedAt: _u, ...rest }) => rest),
      });
    }

    await tx.event.update({
      where: { id: eventId },
      data: { updatedById: caller.id },
    });

    await syncRoutingState(tx, eventId, event.assignmentStrategy, normalizedCoaches.length);
  });

  getRequestLogger().info({ eventId, coachCount: normalizedCoaches.length, newlyAddedCoachUserIds, updatedBy: caller.id }, "Event coach pool updated.");

  if (event.isActive) {
    for (const userId of newlyAddedCoachUserIds) {
      void queueEventCoachAddedNotification({ eventId, coachUserId: userId });
    }
  }

  const refreshedEvent = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    include: eventInclude,
  });

  return { coaches: refreshedEvent.coaches };
};

const removeEventCoach = async (
  eventId: string,
  userId: string,
  caller: CallerContext,
): Promise<{ coaches: SafeEvent["coaches"] }> => {
  const event = await getManagedEvent(eventId, caller);

  if (!userId?.trim()) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "userId is required.");
  }

  const remainingCoaches = event.coaches
    .filter((c) => c.coachUserId !== userId)
    .map((c, index) => ({
      userId: c.coachUserId,
      coachOrder: index + 1,
    }));

  if (remainingCoaches.length === event.coaches.length) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Event coach not found.");
  }

  await validateEventCoaches(event.teamId, event, remainingCoaches);

  await prisma.$transaction(async (tx) => {
    const assignedFutureSlotCount = await tx.eventScheduleSlot.count({
      where: {
        eventId,
        assignedCoachId: userId,
        startTime: { gt: new Date() },
      },
    });

    if (assignedFutureSlotCount > 0) {
      throw new ErrorHandler(
        StatusCodes.CONFLICT,
        `This coach is assigned to ${assignedFutureSlotCount} upcoming slot(s). Reassign them before removing the coach.`,
      );
    }

    const existingOverrides = await tx.eventCoachWeeklyAvailability.findMany({
      where: { eventId },
    });

    await tx.eventCoach.deleteMany({ where: { eventId } });

    if (remainingCoaches.length > 0) {
      await tx.eventCoach.createMany({
        data: remainingCoaches.map((coach) => ({
          eventId,
          coachUserId: coach.userId,
          coachOrder: coach.coachOrder,
        })),
      });
    }

    const retainedCoachIds = new Set(remainingCoaches.map((c) => c.userId));
    const overridesToRestore = existingOverrides.filter((o) => retainedCoachIds.has(o.coachUserId));
    if (overridesToRestore.length > 0) {
      await tx.eventCoachWeeklyAvailability.createMany({
        data: overridesToRestore.map(({ id: _id, createdAt: _c, updatedAt: _u, ...rest }) => rest),
      });
    }

    await tx.event.update({
      where: { id: eventId },
      data: { updatedById: caller.id },
    });

    await syncRoutingState(tx, eventId, event.assignmentStrategy, remainingCoaches.length);
  });

  getRequestLogger().info({ eventId, removedCoachUserId: userId, remainingCoachCount: remainingCoaches.length, updatedBy: caller.id }, "Coach removed from event pool.");

  const refreshedEvent = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    include: eventInclude,
  });

  return { coaches: refreshedEvent.coaches };
};

const getEventCoachWorkload = async (
  eventId: string,
  caller: CallerContext,
): Promise<{ coachUserId: string; bookingCount: number }[]> => {
  const event = await getManagedEvent(eventId, caller, { allowCoachMember: true });

  const coachIds = event.coaches.map((c) => c.coachUserId);
  if (coachIds.length === 0) return [];

  const now = new Date();

  if (event.bookingMode === EventBookingMode.FIXED_SLOTS) {
    // ONE_TO_MANY: each slot = one group session regardless of student count
    const slotCounts = await prisma.eventScheduleSlot.groupBy({
      by: ["assignedCoachId"],
      where: {
        eventId,
        assignedCoachId: { in: coachIds },
        isActive: true,
        isCancelled: false,
        startTime: { gte: now },
      },
      _count: { assignedCoachId: true },
    });
    return slotCounts
      .filter((r): r is typeof r & { assignedCoachId: string } => r.assignedCoachId !== null)
      .map((r) => ({ coachUserId: r.assignedCoachId, bookingCount: r._count.assignedCoachId }));
  }

  // ONE_TO_ONE: each booking = one private session
  const bookingCounts = await prisma.booking.groupBy({
    by: ["coachUserId"],
    where: {
      eventId,
      coachUserId: { in: coachIds },
      status: { not: "CANCELLED" },
      startTime: { gte: now },
    },
    _count: { coachUserId: true },
  });
  return bookingCounts
    .filter((r): r is typeof r & { coachUserId: string } => r.coachUserId !== null)
    .map((r) => ({ coachUserId: r.coachUserId, bookingCount: r._count.coachUserId }));
};

/**
 * Returns the event-specific weekly availability override for a coach.
 * Empty array means the coach's global profile schedule applies for this event.
 * Requires SUPER_ADMIN or TEAM_ADMIN (enforced by the underlying service).
 */
const getEventCoachAvailability = async (
  eventId: string,
  coachUserId: string,
  caller: CallerContext,
) => {
  await getManagedEvent(eventId, caller);

  const membership = await prisma.eventCoach.findUnique({
    where: { eventId_coachUserId: { eventId, coachUserId } },
    select: { isActive: true },
  });

  if (!membership?.isActive) {
    throw new ErrorHandler(
      StatusCodes.NOT_FOUND,
      "Coach is not an active member of this event's pool.",
    );
  }

  return getEventCoachWeeklyAvailability(eventId, coachUserId);
};

/**
 * Atomically replaces the event-specific weekly availability for a coach.
 * Passing an empty array clears the override (global schedule resumes).
 * Validates that the coach is an active member of this event's pool before saving.
 *
 * @throws {ErrorHandler} 404 — coach is not an active member of this event.
 */
const setEventCoachAvailability = async (
  eventId: string,
  coachUserId: string,
  slots: { dayOfWeek: number; startTime: string; endTime: string }[],
  caller: CallerContext,
) => {
  await getManagedEvent(eventId, caller);

  const membership = await prisma.eventCoach.findUnique({
    where: { eventId_coachUserId: { eventId, coachUserId } },
    select: { isActive: true },
  });

  if (!membership?.isActive) {
    throw new ErrorHandler(
      StatusCodes.NOT_FOUND,
      "Coach is not an active member of this event's pool.",
    );
  }

  return setEventCoachWeeklyAvailability(eventId, coachUserId, slots, caller);
};

export {
  validateEventConfiguration,
  listEventCoaches,
  replaceEventCoaches,
  removeEventCoach,
  syncRoutingState,
  getEventCoachAvailability,
  setEventCoachAvailability,
  getEventCoachWorkload,
};
