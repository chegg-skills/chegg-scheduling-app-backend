import { Prisma } from "@prisma/client";

export const debugEventInclude = Prisma.validator<Prisma.EventInclude>()({
  coaches: {
    where: { isActive: true },
    orderBy: { coachOrder: "asc" },
  },
});

export const debugConflictSlotSelect = {
  id: true,
  startTime: true,
  endTime: true,
  eventId: true,
  assignedCoachId: true,
  event: { select: { bufferAfterMinutes: true, name: true } },
} satisfies Prisma.EventScheduleSlotSelect;

export type DebugConflictSlotRow = Prisma.EventScheduleSlotGetPayload<{
  select: typeof debugConflictSlotSelect;
}>;

/** The event as the debug report reads it: active coaches plus the day's slots with their coach. */
export type DebugEventRecord = Prisma.EventGetPayload<{
  include: {
    coaches: { where: { isActive: true }; orderBy: { coachOrder: "asc" } };
    scheduleSlots: {
      include: { assignedCoach: { select: { id: true; firstName: true; lastName: true } } };
    };
  };
}>;
