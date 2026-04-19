import {
  AssignmentStrategy,
  Prisma,
  SessionLeadershipStrategy,
  UserRole,
} from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import type { CallerContext } from "../../shared/utils/userUtils";
import {
  INTERACTION_TYPE_CAPS,
  type InteractionType,
} from "../../shared/constants/interactionType";
import { eventInclude, getManagedEvent, type SafeEvent } from "./event.shared";
import { queueEventCoachAddedNotification } from "./eventCoach.notification";
import { ReplaceEventCoachesSchema } from "./event.schema";

type EventConfigValidationInput = {
  interactionType: InteractionType;
  assignmentStrategy: AssignmentStrategy;
  minCoachCount: number;
  maxCoachCount: number | null;
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

  let requiredMinCoaches = input.minCoachCount;
  if (input.assignmentStrategy === AssignmentStrategy.ROUND_ROBIN) {
    requiredMinCoaches = Math.max(requiredMinCoaches, 2);
  } else {
    // DIRECT events can have 0 coaches for now (assigned later)
    requiredMinCoaches = 0;
  }

  if (input.coachCount > 0 && input.coachCount < requiredMinCoaches) {
    if (input.assignmentStrategy === AssignmentStrategy.ROUND_ROBIN && input.coachCount < 2) {
      throw new ErrorHandler(
        StatusCodes.BAD_REQUEST,
        "ROUND_ROBIN events require at least two coaches.",
      );
    }

    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      `This event requires at least ${requiredMinCoaches} coach(es).`,
    );
  }

  if (input.maxCoachCount !== null && input.coachCount > input.maxCoachCount) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      `This event exceeds the maximum coach limit of ${input.maxCoachCount}.`,
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
    minCoachCount: number;
    maxCoachCount: number | null;
  },
  coaches: Array<{ userId: string; coachOrder: number }>,
): Promise<void> => {
  validateEventConfiguration({
    interactionType: event.interactionType,
    assignmentStrategy: event.assignmentStrategy,
    minCoachCount: event.minCoachCount,
    maxCoachCount: event.maxCoachCount,
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
  const event = await getManagedEvent(eventId, caller);
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
      "ROUND_ROBIN events require at least two coaches.",
    );
  }

  const existingCoachUserIds = new Set(event.coaches.map((c) => c.coachUserId));
  const newlyAddedCoachUserIds = normalizedCoaches
    .map((c) => c.userId)
    .filter((userId) => !existingCoachUserIds.has(userId));

  await validateEventCoaches(event.teamId, event, normalizedCoaches);

  await prisma.$transaction(async (tx) => {
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

    await tx.event.update({
      where: { id: eventId },
      data: { updatedById: caller.id },
    });

    await syncRoutingState(tx, eventId, event.assignmentStrategy, normalizedCoaches.length);
  });

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

    await tx.event.update({
      where: { id: eventId },
      data: { updatedById: caller.id },
    });

    await syncRoutingState(tx, eventId, event.assignmentStrategy, remainingCoaches.length);
  });

  const refreshedEvent = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    include: eventInclude,
  });

  return { coaches: refreshedEvent.coaches };
};

export {
  validateEventConfiguration,
  listEventCoaches,
  replaceEventCoaches,
  removeEventCoach,
  syncRoutingState,
};
