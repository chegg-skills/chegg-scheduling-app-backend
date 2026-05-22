import { Prisma } from "@prisma/client";

export const eventGroupInclude = Prisma.validator<Prisma.EventGroupInclude>()({
  _count: {
    select: {
      events: true,
    },
  },
});

export type SafeEventGroup = Prisma.EventGroupGetPayload<{
  include: typeof eventGroupInclude;
}>;

export type CreateEventGroupInput = {
  name: string;
  description?: string | null;
  color?: string | null;
};

export type UpdateEventGroupInput = Partial<CreateEventGroupInput>;
