import { prisma } from "../../shared/db/prisma";
import type { DbClient } from "../../shared/db/repository";
import { bookingInclude, type SafeBooking } from "../bookings/booking.shared";
import {
  joinBookingSelect,
  publicCoachSelect,
  publicDirectoryInclude,
  publicEventSelect,
  publicGroupSelect,
  publicTeamSelect,
  type JoinBookingRecord,
  type PublicCoachRecord,
  type PublicDirectoryRecord,
  type PublicEvent,
  type PublicEventWithState,
  type PublicEventWithType,
  type PublicGroup,
  type PublicTeam,
} from "./public.shared";

export interface PublicRepository {
  listActiveTeams(tx?: DbClient): Promise<PublicTeam[]>;
  findActiveTeamBySlug(slug: string, tx?: DbClient): Promise<PublicTeam | null>;
  listActiveTeamEvents(teamId: string, tx?: DbClient): Promise<PublicEvent[]>;
  findEventBySlug(slug: string, tx?: DbClient): Promise<PublicEventWithState | null>;
  findCoachBySlug(slug: string, tx?: DbClient): Promise<PublicCoachRecord | null>;
  listActiveCoachEvents(coachId: string, tx?: DbClient): Promise<PublicEvent[]>;
  findGroupBySlug(slug: string, tx?: DbClient): Promise<PublicGroup | null>;
  listActiveGroupEvents(groupId: string, tx?: DbClient): Promise<PublicEvent[]>;
  findDirectoryBySlug(slug: string, tx?: DbClient): Promise<PublicDirectoryRecord | null>;
  /** Active events matching any of the (teamId, eventTypeId) pairs, in one query. */
  listActiveEventsForPairs(
    pairs: Array<{ teamId: string; eventTypeId: string }>,
    tx?: DbClient,
  ): Promise<PublicEventWithType[]>;
  findBookingForJoin(
    bookingId: string,
    sessionToken: string,
    tx?: DbClient,
  ): Promise<JoinBookingRecord | null>;
  findBookingByRescheduleToken(
    id: string,
    rescheduleToken: string,
    tx?: DbClient,
  ): Promise<SafeBooking | null>;
}

export const createPublicRepo = (db: DbClient = prisma): PublicRepository => ({
  listActiveTeams: (tx) =>
    (tx ?? db).team.findMany({
      where: { isActive: true },
      select: publicTeamSelect,
      orderBy: { name: "asc" },
    }),

  findActiveTeamBySlug: (slug, tx) =>
    (tx ?? db).team.findFirst({
      where: {
        publicBookingSlug: slug,
        isActive: true,
      },
      select: publicTeamSelect,
    }),

  listActiveTeamEvents: (teamId, tx) =>
    (tx ?? db).event.findMany({
      where: {
        teamId,
        isActive: true,
        team: { isActive: true },
      },
      select: publicEventSelect,
      orderBy: { name: "asc" },
    }),

  findEventBySlug: (slug, tx) =>
    (tx ?? db).event.findFirst({
      where: { publicBookingSlug: slug },
      select: { ...publicEventSelect, isActive: true },
    }),

  findCoachBySlug: (slug, tx) =>
    (tx ?? db).user.findUnique({
      where: { publicBookingSlug: slug },
      select: {
        ...publicCoachSelect,
        role: true,
        isActive: true,
      },
    }),

  listActiveCoachEvents: (coachId, tx) =>
    (tx ?? db).event.findMany({
      where: {
        isActive: true,
        team: { isActive: true },
        coaches: {
          some: {
            coachUserId: coachId,
            isActive: true,
          },
        },
      },
      select: publicEventSelect,
      orderBy: { name: "asc" },
    }),

  findGroupBySlug: (slug, tx) =>
    (tx ?? db).eventGroup.findUnique({
      where: {
        publicBookingSlug: slug,
      },
      select: publicGroupSelect,
    }),

  listActiveGroupEvents: (groupId, tx) =>
    (tx ?? db).event.findMany({
      where: {
        groupId,
        isActive: true,
        team: { isActive: true },
      },
      select: publicEventSelect,
      orderBy: { name: "asc" },
    }),

  findDirectoryBySlug: (slug, tx) =>
    (tx ?? db).bookingDirectory.findUnique({
      where: { slug },
      include: publicDirectoryInclude,
    }),

  listActiveEventsForPairs: (pairs, tx) =>
    (tx ?? db).event.findMany({
      where: { isActive: true, OR: pairs },
      select: { ...publicEventSelect, eventTypeId: true },
      orderBy: { name: "asc" },
    }),

  findBookingForJoin: (bookingId, sessionToken, tx) =>
    (tx ?? db).booking.findFirst({
      where: { id: bookingId, sessionToken },
      select: joinBookingSelect,
    }),

  findBookingByRescheduleToken: (id, rescheduleToken, tx) =>
    (tx ?? db).booking.findFirst({
      where: { id, rescheduleToken } as any,
      include: bookingInclude,
    }),
});
