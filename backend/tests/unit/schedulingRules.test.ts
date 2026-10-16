import { BookingStatus, EventBookingMode, MeetingLinkSource } from "@prisma/client";
import {
  assertBookingNoticeSatisfied,
  assertParticipantCapacityAvailable,
  getEffectiveParticipantPolicy,
} from "../../src/domain/scheduling/eventRules";
import {
  filterConflictsForSlot,
  type BookingWithEventBuffer,
} from "../../src/domain/scheduling/conflictRules";
import {
  assertCancelTokenValid,
  assertRescheduleTokenValid,
  getMeetingJoinUrl,
} from "../../src/domain/scheduling/bookingRules";
import { ErrorHandler } from "../../src/shared/error/errorhandler";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

const statusOf = (fn: () => unknown): number | undefined => {
  try {
    fn();
    return undefined;
  } catch (error) {
    expect(error).toBeInstanceOf(ErrorHandler);
    return (error as ErrorHandler).statusCode;
  }
};

describe("event rules", () => {
  describe("assertBookingNoticeSatisfied", () => {
    it("accepts a start time at least the minimum notice away", () => {
      expect(
        statusOf(() => assertBookingNoticeSatisfied(60, new Date(Date.now() + 2 * HOUR))),
      ).toBeUndefined();
    });
    it("rejects (400) a start time closer than the minimum notice", () => {
      expect(
        statusOf(() => assertBookingNoticeSatisfied(60, new Date(Date.now() + 30 * MIN))),
      ).toBe(400);
    });
    it("with zero notice, still rejects a start time in the past", () => {
      expect(
        statusOf(() => assertBookingNoticeSatisfied(0, new Date(Date.now() + 5_000))),
      ).toBeUndefined();
      expect(statusOf(() => assertBookingNoticeSatisfied(0, new Date(Date.now() - 5_000)))).toBe(
        400,
      );
    });
  });

  describe("assertParticipantCapacityAvailable", () => {
    it("has no limit when max is null", () => {
      expect(statusOf(() => assertParticipantCapacityAvailable(null, 1000))).toBeUndefined();
    });
    it("allows while below capacity and rejects (409) at or above it", () => {
      expect(statusOf(() => assertParticipantCapacityAvailable(5, 4))).toBeUndefined();
      expect(statusOf(() => assertParticipantCapacityAvailable(5, 5))).toBe(409);
      expect(statusOf(() => assertParticipantCapacityAvailable(5, 6))).toBe(409);
    });
  });

  describe("getEffectiveParticipantPolicy", () => {
    const event = (overrides = {}) => ({
      interactionType: "ONE_TO_MANY" as const,
      bookingMode: EventBookingMode.FIXED_SLOTS,
      maxParticipantCount: 10,
      ...overrides,
    });

    it("is always 1 for single-participant interaction types", () => {
      expect(
        getEffectiveParticipantPolicy(
          event({ interactionType: "ONE_TO_ONE", maxParticipantCount: 10 }),
        ),
      ).toEqual({ maxParticipants: 1 });
      expect(
        getEffectiveParticipantPolicy(event({ interactionType: "MANY_TO_ONE" }), { capacity: 8 }),
      ).toEqual({ maxParticipants: 1 });
    });
    it("in FIXED_SLOTS mode prefers the slot capacity, then the event max, then no limit", () => {
      expect(getEffectiveParticipantPolicy(event(), { capacity: 4 })).toEqual({
        maxParticipants: 4,
      });
      expect(getEffectiveParticipantPolicy(event(), { capacity: null })).toEqual({
        maxParticipants: 10,
      });
      expect(getEffectiveParticipantPolicy(event(), null)).toEqual({ maxParticipants: 10 });
      expect(getEffectiveParticipantPolicy(event({ maxParticipantCount: null }))).toEqual({
        maxParticipants: null,
      });
    });
    it("outside FIXED_SLOTS mode ignores the slot and uses the event max", () => {
      expect(
        getEffectiveParticipantPolicy(event({ bookingMode: EventBookingMode.COACH_AVAILABILITY }), {
          capacity: 4,
        }),
      ).toEqual({ maxParticipants: 10 });
    });
  });
});

describe("conflict rules — filterConflictsForSlot", () => {
  const at = (minutes: number) => new Date(Date.UTC(2026, 5, 1, 12, 0) + minutes * MIN);
  const booking = (overrides: Record<string, unknown> = {}): BookingWithEventBuffer =>
    ({
      id: "b",
      eventId: "e-other",
      scheduleSlotId: null,
      startTime: at(0),
      endTime: at(30),
      event: { bufferAfterMinutes: 0 },
      ...overrides,
    }) as unknown as BookingWithEventBuffer;

  const start = at(10);
  const end = at(40);

  it("keeps a booking that truly overlaps the window", () => {
    expect(filterConflictsForSlot([booking()], start, end)).toHaveLength(1);
  });
  it("drops a booking that ended before the slot starts", () => {
    expect(
      filterConflictsForSlot([booking({ startTime: at(-60), endTime: at(5) })], start, end),
    ).toHaveLength(0);
  });
  it("counts the booking's after-buffer: a booking ending just before still conflicts", () => {
    const b = booking({ startTime: at(-60), endTime: at(5), event: { bufferAfterMinutes: 10 } });
    expect(filterConflictsForSlot([b], start, end)).toHaveLength(1);
  });
  it("drops a booking that starts after the slot ends", () => {
    expect(
      filterConflictsForSlot([booking({ startTime: at(50), endTime: at(80) })], start, end),
    ).toHaveLength(0);
  });
  it("ignores bookings that ended more than two hours before the slot (lookback window)", () => {
    const b = booking({
      startTime: at(-300),
      endTime: at(-200),
      event: { bufferAfterMinutes: 500 },
    });
    expect(filterConflictsForSlot([b], start, end)).toHaveLength(0);
  });

  describe("same-session exclusion", () => {
    it("excludes bookings on the same schedule slot", () => {
      const same = booking({ scheduleSlotId: "slot-1", eventId: "e-1" });
      const other = booking({ scheduleSlotId: "slot-2", eventId: "e-1" });
      const result = filterConflictsForSlot([same, other], start, end, {
        eventId: "e-1",
        scheduleSlotId: "slot-1",
      });
      expect(result).toEqual([other]);
    });
    it("without a slot, excludes only the same event at exactly the same start and end", () => {
      const exact = booking({ eventId: "e-1", startTime: start, endTime: end });
      const sameEventDifferentTime = booking({ eventId: "e-1", startTime: at(0), endTime: at(30) });
      const otherEventSameTime = booking({ eventId: "e-2", startTime: start, endTime: end });
      const result = filterConflictsForSlot(
        [exact, sameEventDifferentTime, otherEventSameTime],
        start,
        end,
        { eventId: "e-1" },
      );
      expect(result).toEqual([sameEventDifferentTime, otherEventSameTime]);
    });
    it("does not exclude anything when no eventId is given", () => {
      const exact = booking({ eventId: "e-1", startTime: start, endTime: end });
      expect(filterConflictsForSlot([exact], start, end)).toHaveLength(1);
    });
  });
});

describe("booking rules", () => {
  describe("getMeetingJoinUrl", () => {
    it("with EVENT_LOCATION, prefers the shared location over the coach's link", () => {
      const event = {
        meetingLinkSource: MeetingLinkSource.EVENT_LOCATION,
        locationValue: "https://loc",
      };
      expect(getMeetingJoinUrl(event, "https://coach")).toBe("https://loc");
      expect(getMeetingJoinUrl({ ...event, locationValue: null }, "https://coach")).toBe(
        "https://coach",
      );
    });
    it("otherwise prefers the coach's link, falling back to the location", () => {
      const event = {
        meetingLinkSource: MeetingLinkSource.COACH_PERSONAL_LINK,
        locationValue: "https://loc",
      };
      expect(getMeetingJoinUrl(event, "https://coach")).toBe("https://coach");
      expect(getMeetingJoinUrl(event, null)).toBe("https://loc");
      expect(getMeetingJoinUrl({ ...event, locationValue: null }, undefined)).toBeNull();
    });
  });

  describe("assertCancelTokenValid", () => {
    const future = new Date(Date.now() + HOUR);
    it("accepts a pending or confirmed booking that has not started", () => {
      expect(
        statusOf(() =>
          assertCancelTokenValid({ status: BookingStatus.PENDING, startTime: future }),
        ),
      ).toBeUndefined();
      expect(
        statusOf(() =>
          assertCancelTokenValid({ status: BookingStatus.CONFIRMED, startTime: future }),
        ),
      ).toBeUndefined();
    });
    it("409s an already-cancelled booking, 403s other statuses and started sessions", () => {
      expect(
        statusOf(() =>
          assertCancelTokenValid({ status: BookingStatus.CANCELLED, startTime: future }),
        ),
      ).toBe(409);
      expect(
        statusOf(() =>
          assertCancelTokenValid({ status: BookingStatus.COMPLETED, startTime: future }),
        ),
      ).toBe(403);
      expect(
        statusOf(() =>
          assertCancelTokenValid({
            status: BookingStatus.CONFIRMED,
            startTime: new Date(Date.now() - MIN),
          }),
        ),
      ).toBe(403);
    });
  });

  describe("assertRescheduleTokenValid", () => {
    const booking = (startOffsetMs: number, status: BookingStatus = BookingStatus.CONFIRMED) => ({
      status,
      startTime: new Date(Date.now() + startOffsetMs),
      event: { durationSeconds: 1800 },
    });
    it("accepts pending/confirmed bookings, including one that just started", () => {
      expect(statusOf(() => assertRescheduleTokenValid(booking(HOUR)))).toBeUndefined();
      expect(
        statusOf(() => assertRescheduleTokenValid(booking(-10 * MIN, BookingStatus.PENDING))),
      ).toBeUndefined();
    });
    it("403s other statuses", () => {
      expect(
        statusOf(() => assertRescheduleTokenValid(booking(HOUR, BookingStatus.CANCELLED))),
      ).toBe(403);
    });
    it("stays valid for 2 hours after the session ends, then 403s", () => {
      // session = 30 min, so it ends at start+30m; grace runs to start+2h30m
      expect(
        statusOf(() => assertRescheduleTokenValid(booking(-(2 * HOUR + 20 * MIN)))),
      ).toBeUndefined();
      expect(statusOf(() => assertRescheduleTokenValid(booking(-(2 * HOUR + 40 * MIN))))).toBe(403);
    });
  });
});
