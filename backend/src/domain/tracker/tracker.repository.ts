import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import type { DbClient } from "../../shared/db/repository";

const trackerSlotInclude = {
  event: {
    select: {
      id: true,
      name: true,
      maxParticipantCount: true,
      teamId: true,
      team: { select: { id: true, name: true } },
      eventType: { select: { id: true, name: true } },
    },
  },
  assignedCoach: { select: { id: true, firstName: true, lastName: true, zoomIsvLink: true } },
  recurrenceGroup: { select: { id: true, frequency: true } },
  sessionLog: {
    select: {
      id: true,
      summary: true,
      coachNotes: true,
      attendance: {
        select: {
          attended: true,
        },
      },
    },
  },
  _count: { select: { bookings: { where: { status: { not: "CANCELLED" } } } } },
} satisfies Prisma.EventScheduleSlotInclude;

export type TrackerSlotRow = Prisma.EventScheduleSlotGetPayload<{
  include: typeof trackerSlotInclude;
}>;

export interface TrackerRepository {
  findSlots(where: Prisma.EventScheduleSlotWhereInput, tx?: DbClient): Promise<TrackerSlotRow[]>;
  findSlotIdsByRecurrenceGroups(
    recurrenceGroupIds: string[],
    tx?: DbClient,
  ): Promise<Array<{ id: string; recurrenceGroupId: string | null }>>;
  findSlotStartTimes(
    where: Prisma.EventScheduleSlotWhereInput,
    tx?: DbClient,
  ): Promise<Array<{ startTime: Date }>>;
  findTeams(
    where: Prisma.TeamWhereInput,
    tx?: DbClient,
  ): Promise<Array<{ id: string; name: string }>>;
  findEvents(
    where: Prisma.EventWhereInput,
    tx?: DbClient,
  ): Promise<Array<{ id: string; name: string; teamId: string }>>;
}

export const createTrackerRepo = (db: DbClient = prisma): TrackerRepository => ({
  findSlots: (where, tx) =>
    (tx ?? db).eventScheduleSlot.findMany({
      where,
      include: trackerSlotInclude,
      orderBy: { startTime: "asc" },
    }),

  findSlotIdsByRecurrenceGroups: (recurrenceGroupIds, tx) =>
    (tx ?? db).eventScheduleSlot.findMany({
      where: { recurrenceGroupId: { in: recurrenceGroupIds }, isCancelled: false },
      select: { id: true, recurrenceGroupId: true },
      orderBy: { startTime: "asc" },
    }),

  findSlotStartTimes: (where, tx) =>
    (tx ?? db).eventScheduleSlot.findMany({ where, select: { startTime: true } }),

  findTeams: (where, tx) =>
    (tx ?? db).team.findMany({ where, select: { id: true, name: true }, orderBy: { name: "asc" } }),

  findEvents: (where, tx) =>
    (tx ?? db).event.findMany({
      where,
      select: { id: true, name: true, teamId: true },
      orderBy: { name: "asc" },
    }),
});
