import { Prisma } from "@prisma/client";

export const availabilityEventInclude = Prisma.validator<Prisma.EventInclude>()({
  scheduleSlots: {
    where: {
      isActive: true,
    },
    orderBy: { startTime: "asc" },
  },
  coaches: {
    where: { isActive: true },
    orderBy: { coachOrder: "asc" },
  },
});

export const slotAvailabilityScheduleSlotInclude = {
  assignedCoach: {
    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
  },
} satisfies Prisma.EventScheduleSlotInclude;

export type AvailabilityScheduleSlot = Prisma.EventScheduleSlotGetPayload<{
  include: typeof slotAvailabilityScheduleSlotInclude;
}>;

export const slotAvailabilityEventInclude = Prisma.validator<Prisma.EventInclude>()({
  coaches: availabilityEventInclude.coaches,
  scheduleSlots: {
    where: { isActive: true },
    include: slotAvailabilityScheduleSlotInclude,
    orderBy: { startTime: "asc" },
  },
});

export type AvailabilityEvent = Prisma.EventGetPayload<{
  include: typeof slotAvailabilityEventInclude;
}>;

export const conflictSlotSelect = {
  id: true,
  startTime: true,
  endTime: true,
  eventId: true,
  assignedCoachId: true,
  event: { select: { bufferAfterMinutes: true } },
} satisfies Prisma.EventScheduleSlotSelect;

export type ConflictSlotRow = Prisma.EventScheduleSlotGetPayload<{
  select: typeof conflictSlotSelect;
}>;
