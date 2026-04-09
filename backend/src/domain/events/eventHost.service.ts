import {
  AssignmentStrategy,
  Prisma,
  SessionLeadershipStrategy,
  UserRole,
  type EventInteractionType as EventInteractionTypeModel,
} from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import type { CallerContext } from "../../shared/utils/userUtils";
import {
  eventInclude,
  getManagedEvent,
  normalizeRequiredString,
  type ReplaceEventHostsInput,
  type SafeEvent,
} from "./event.shared";
import { queueEventHostAddedNotification } from "./eventHost.notification";

const validateEventConfiguration = (
  interactionType: EventInteractionTypeModel,
  config: {
    assignmentStrategy: AssignmentStrategy;
    hostCount: number;
    sessionLeadershipStrategy?: SessionLeadershipStrategy;
    fixedLeadHostId?: string | null;
    hostUserIds?: string[];
  },
): void => {
  if (
    config.assignmentStrategy === AssignmentStrategy.ROUND_ROBIN &&
    !interactionType.supportsRoundRobin
  ) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      `Interaction type "${interactionType.name}" does not support ROUND_ROBIN assignment.`,
    );
  }

  if (
    config.sessionLeadershipStrategy &&
    config.sessionLeadershipStrategy !== SessionLeadershipStrategy.SINGLE_HOST &&
    !interactionType.supportsSimultaneousCoaches
  ) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      `Interaction type "${interactionType.name}" does not support simultaneous co-hosting.`,
    );
  }

  if (
    config.sessionLeadershipStrategy === SessionLeadershipStrategy.FIXED_LEAD &&
    !config.fixedLeadHostId
  ) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "FIXED_LEAD events require a fixedLeadHostId.",
    );
  }

  if (
    config.sessionLeadershipStrategy === SessionLeadershipStrategy.FIXED_LEAD &&
    config.fixedLeadHostId &&
    config.hostUserIds?.length &&
    !config.hostUserIds.includes(config.fixedLeadHostId)
  ) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "The fixed lead coach must be one of the event's assigned coaches.",
    );
  }

  let requiredMinHosts = interactionType.minHosts;
  if (config.assignmentStrategy === AssignmentStrategy.ROUND_ROBIN) {
    requiredMinHosts = Math.max(requiredMinHosts, 2);
  } else {
    // DIRECT events can have 0 hosts for now (assigned later)
    requiredMinHosts = 0;
  }

  if (config.hostCount > 0 && config.hostCount < requiredMinHosts) {
    if (
      config.assignmentStrategy === AssignmentStrategy.ROUND_ROBIN &&
      config.hostCount < 2
    ) {
      throw new ErrorHandler(
        StatusCodes.BAD_REQUEST,
        "ROUND_ROBIN events require at least two hosts.",
      );
    }

    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      `This event requires at least ${requiredMinHosts} host(s) based on its interaction type.`,
    );
  }

  if (
    interactionType.maxHosts !== null &&
    config.hostCount > interactionType.maxHosts
  ) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      `This event exceeds the maximum host limit of ${interactionType.maxHosts} for its interaction type.`,
    );
  }
};

const normalizeHostInputs = (
  payload: ReplaceEventHostsInput,
): Array<{ userId: string; hostOrder: number }> => {
  if (!Array.isArray(payload.hosts)) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "hosts must be an array.",
    );
  }

  const withOrder = payload.hosts.map((host, index) => {
    const userId = normalizeRequiredString(host?.userId, "userId");
    const rawHostOrder = host?.hostOrder;

    if (
      rawHostOrder !== undefined &&
      (!Number.isInteger(rawHostOrder) || Number(rawHostOrder) <= 0)
    ) {
      throw new ErrorHandler(
        StatusCodes.BAD_REQUEST,
        "hostOrder must be a positive integer when provided.",
      );
    }

    return {
      userId,
      hostOrder: rawHostOrder ?? index + 1,
    };
  });

  const uniqueUserIds = new Set(withOrder.map((host) => host.userId));
  if (uniqueUserIds.size !== withOrder.length) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "Each host userId must be unique.",
    );
  }

  return withOrder
    .sort((left, right) => left.hostOrder - right.hostOrder)
    .map((host, index) => ({
      userId: host.userId,
      hostOrder: index + 1,
    }));
};

const validateEventHosts = async (
  teamId: string,
  event: {
    interactionType: EventInteractionTypeModel;
    assignmentStrategy: AssignmentStrategy;
  },
  hosts: Array<{ userId: string; hostOrder: number }>,
): Promise<void> => {
  validateEventConfiguration(event.interactionType, {
    assignmentStrategy: event.assignmentStrategy,
    hostCount: hosts.length,
  });

  if (hosts.length === 0) {
    return;
  }

  const userIds = hosts.map((host) => host.userId);
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
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "One or more selected hosts do not exist.",
    );
  }

  const membershipIds = new Set(memberships.map((membership) => membership.userId));
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
        "SUPER_ADMIN users cannot be assigned as event hosts.",
      );
    }

    if (!membershipIds.has(user.id)) {
      throw new ErrorHandler(
        StatusCodes.BAD_REQUEST,
        "All hosts must be active members of the event's team.",
      );
    }
  }
};

const syncRoutingState = async (
  tx: Prisma.TransactionClient,
  eventId: string,
  assignmentStrategy: AssignmentStrategy,
  hostCount: number,
): Promise<void> => {
  if (assignmentStrategy === AssignmentStrategy.ROUND_ROBIN && hostCount > 0) {
    await tx.eventRoutingState.upsert({
      where: { eventId },
      update: { nextHostOrder: 1 },
      create: { eventId, nextHostOrder: 1 },
    });
    return;
  }

  await tx.eventRoutingState.deleteMany({ where: { eventId } });
};

const listEventHosts = async (
  eventId: string,
  caller: CallerContext,
): Promise<{ hosts: SafeEvent["hosts"] }> => {
  const event = await getManagedEvent(eventId, caller);
  return { hosts: event.hosts };
};

const replaceEventHosts = async (
  eventId: string,
  payload: ReplaceEventHostsInput,
  caller: CallerContext,
): Promise<{ hosts: SafeEvent["hosts"] }> => {
  const event = await getManagedEvent(eventId, caller);
  const normalizedHosts = normalizeHostInputs(payload);

  if (
    event.assignmentStrategy === AssignmentStrategy.ROUND_ROBIN &&
    normalizedHosts.length < 2
  ) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "ROUND_ROBIN events require at least two hosts.",
    );
  }

  const existingHostUserIds = new Set(event.hosts.map((h) => h.hostUserId));
  const newlyAddedHostUserIds = normalizedHosts
    .map((h) => h.userId)
    .filter((userId) => !existingHostUserIds.has(userId));

  await validateEventHosts(event.teamId, event, normalizedHosts);

  await prisma.$transaction(async (tx) => {
    await tx.eventHost.deleteMany({ where: { eventId } });

    if (normalizedHosts.length > 0) {
      await tx.eventHost.createMany({
        data: normalizedHosts.map((host) => ({
          eventId,
          hostUserId: host.userId,
          hostOrder: host.hostOrder,
        })),
      });
    }

    await tx.event.update({
      where: { id: eventId },
      data: {
        updatedById: caller.id,
      },
    });

    await syncRoutingState(
      tx,
      eventId,
      event.assignmentStrategy,
      normalizedHosts.length,
    );
  });

  if (event.isActive) {
    for (const userId of newlyAddedHostUserIds) {
      void queueEventHostAddedNotification({ eventId, hostUserId: userId });
    }
  }

  const refreshedEvent = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    include: eventInclude,
  });

  return { hosts: refreshedEvent.hosts };
};

const removeEventHost = async (
  eventId: string,
  userId: string,
  caller: CallerContext,
): Promise<{ hosts: SafeEvent["hosts"] }> => {
  const event = await getManagedEvent(eventId, caller);

  if (!userId?.trim()) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "userId is required.");
  }

  const remainingHosts = event.hosts
    .filter((host) => host.hostUserId !== userId)
    .map((host, index) => ({
      userId: host.hostUserId,
      hostOrder: index + 1,
    }));

  if (remainingHosts.length === event.hosts.length) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Event host not found.");
  }

  await validateEventHosts(event.teamId, event, remainingHosts);

  await prisma.$transaction(async (tx) => {
    await tx.eventHost.deleteMany({ where: { eventId } });

    if (remainingHosts.length > 0) {
      await tx.eventHost.createMany({
        data: remainingHosts.map((host) => ({
          eventId,
          hostUserId: host.userId,
          hostOrder: host.hostOrder,
        })),
      });
    }

    await tx.event.update({
      where: { id: eventId },
      data: { updatedById: caller.id },
    });

    await syncRoutingState(
      tx,
      eventId,
      event.assignmentStrategy,
      remainingHosts.length,
    );
  });

  const refreshedEvent = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    include: eventInclude,
  });

  return { hosts: refreshedEvent.hosts };
};

export {
  validateEventConfiguration,
  listEventHosts,
  replaceEventHosts,
  removeEventHost,
  syncRoutingState,
};
