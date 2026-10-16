import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import type { DbClient } from "../../shared/db/repository";

export const bookingDirectoryInclude = Prisma.validator<Prisma.BookingDirectoryInclude>()({
  sections: {
    orderBy: { sortOrder: "asc" },
    include: {
      eventType: true,
      teams: {
        orderBy: { sortOrder: "asc" },
        include: {
          team: { select: { id: true, name: true, publicBookingSlug: true, isActive: true } },
        },
      },
    },
  },
});

export type SafeBookingDirectory = Prisma.BookingDirectoryGetPayload<{
  include: typeof bookingDirectoryInclude;
}>;

export interface BookingDirectoryRepository {
  findByIdWithSections(id: string, tx?: DbClient): Promise<SafeBookingDirectory | null>;
  findAllWithSections(tx?: DbClient): Promise<SafeBookingDirectory[]>;
  create(
    data: Prisma.BookingDirectoryUncheckedCreateInput,
    tx?: DbClient,
  ): Promise<SafeBookingDirectory>;
  update(
    id: string,
    data: Prisma.BookingDirectoryUncheckedUpdateInput,
    tx?: DbClient,
  ): Promise<SafeBookingDirectory>;
  delete(id: string, tx?: DbClient): Promise<void>;

  findEventTypeById(id: string, tx?: DbClient): Promise<{ id: string; isActive: boolean } | null>;
  findActiveTeamById(id: string, tx?: DbClient): Promise<{ id: string } | null>;

  findSectionById(
    id: string,
    tx?: DbClient,
  ): Promise<{ id: string; bookingDirectoryId: string } | null>;
  createSection(
    data: Prisma.BookingDirectorySectionUncheckedCreateInput,
    tx?: DbClient,
  ): Promise<void>;
  deleteSection(id: string, tx?: DbClient): Promise<void>;

  findSectionTeam(sectionId: string, teamId: string, tx?: DbClient): Promise<{ id: string } | null>;
  createSectionTeam(
    data: { sectionId: string; teamId: string; sortOrder: number },
    tx?: DbClient,
  ): Promise<void>;
  deleteSectionTeam(sectionId: string, teamId: string, tx?: DbClient): Promise<void>;
}

export const createBookingDirectoryRepo = (db: DbClient = prisma): BookingDirectoryRepository => ({
  findByIdWithSections: (id, tx) =>
    (tx ?? db).bookingDirectory.findUnique({ where: { id }, include: bookingDirectoryInclude }),

  findAllWithSections: (tx) =>
    (tx ?? db).bookingDirectory.findMany({
      orderBy: { createdAt: "asc" },
      include: bookingDirectoryInclude,
    }),

  create: (data, tx) =>
    (tx ?? db).bookingDirectory.create({ data, include: bookingDirectoryInclude }),

  update: (id, data, tx) =>
    (tx ?? db).bookingDirectory.update({ where: { id }, data, include: bookingDirectoryInclude }),

  delete: async (id, tx) => {
    await (tx ?? db).bookingDirectory.delete({ where: { id } });
  },

  findEventTypeById: (id, tx) => (tx ?? db).eventType.findUnique({ where: { id } }),

  findActiveTeamById: (id, tx) => (tx ?? db).team.findFirst({ where: { id, deletedAt: null } }),

  findSectionById: (id, tx) => (tx ?? db).bookingDirectorySection.findUnique({ where: { id } }),

  createSection: async (data, tx) => {
    await (tx ?? db).bookingDirectorySection.create({ data });
  },

  deleteSection: async (id, tx) => {
    await (tx ?? db).bookingDirectorySection.delete({ where: { id } });
  },

  findSectionTeam: (sectionId, teamId, tx) =>
    (tx ?? db).bookingDirectoryTeam.findUnique({
      where: { sectionId_teamId: { sectionId, teamId } },
    }),

  createSectionTeam: async (data, tx) => {
    await (tx ?? db).bookingDirectoryTeam.create({ data });
  },

  deleteSectionTeam: async (sectionId, teamId, tx) => {
    await (tx ?? db).bookingDirectoryTeam.delete({
      where: { sectionId_teamId: { sectionId, teamId } },
    });
  },
});
