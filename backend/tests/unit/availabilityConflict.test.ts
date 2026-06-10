import {
  filterConflictsForSlot,
  type BookingWithEventBuffer,
} from "../../src/domain/availability/availabilityConflict.service";

// Minimal factory — only the fields filterConflictsForSlot inspects.
function makeBooking(
  startTime: Date,
  endTime: Date,
  overrides: {
    eventId?: string;
    scheduleSlotId?: string | null;
    bufferAfterMinutes?: number | null;
  } = {},
): BookingWithEventBuffer {
  return {
    startTime,
    endTime,
    eventId: overrides.eventId ?? "event-default",
    scheduleSlotId: overrides.scheduleSlotId ?? null,
    event: {
      bufferAfterMinutes: overrides.bufferAfterMinutes ?? 0,
    },
  } as BookingWithEventBuffer;
}

describe("filterConflictsForSlot", () => {
  const slotStart = new Date("2026-06-16T10:00:00.000Z");
  const slotEnd = new Date("2026-06-16T11:00:00.000Z"); // 60-min slot, no buffer

  it("returns empty array when allConflicts is empty", () => {
    expect(filterConflictsForSlot([], slotStart, slotEnd)).toEqual([]);
  });

  it("includes a booking that overlaps the slot window", () => {
    // Booking from 10:05–11:05 — clearly overlaps the 10:00–11:00 slot
    const booking = makeBooking(
      new Date("2026-06-16T10:05:00.000Z"),
      new Date("2026-06-16T11:05:00.000Z"),
    );
    const result = filterConflictsForSlot([booking], slotStart, slotEnd);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(booking);
  });

  it("excludes a booking entirely before the lookback window", () => {
    // Booking ends 3 hours before slot start — beyond the 120-min lookback
    const booking = makeBooking(
      new Date("2026-06-16T06:00:00.000Z"),
      new Date("2026-06-16T07:00:00.000Z"),
    );
    expect(filterConflictsForSlot([booking], slotStart, slotEnd)).toHaveLength(0);
  });

  it("excludes a booking that starts after slotEnd (no overlap)", () => {
    // Booking starts exactly at slot end — no overlap
    const booking = makeBooking(
      new Date("2026-06-16T11:00:00.000Z"),
      new Date("2026-06-16T12:00:00.000Z"),
    );
    expect(filterConflictsForSlot([booking], slotStart, slotEnd)).toHaveLength(0);
  });

  it("excludes same-session booking when scheduleSlotId matches", () => {
    const booking = makeBooking(
      new Date("2026-06-16T10:05:00.000Z"),
      new Date("2026-06-16T11:05:00.000Z"),
      { scheduleSlotId: "slot-abc", eventId: "event-xyz" },
    );
    const result = filterConflictsForSlot([booking], slotStart, slotEnd, {
      eventId: "event-xyz",
      scheduleSlotId: "slot-abc",
    });
    expect(result).toHaveLength(0);
  });

  it("excludes same-session booking by eventId+time when no scheduleSlotId", () => {
    // booking at exactly slotStart/slotEnd for the same event → same-session exclusion
    const booking = makeBooking(slotStart, slotEnd, { eventId: "event-xyz" });
    const result = filterConflictsForSlot([booking], slotStart, slotEnd, {
      eventId: "event-xyz",
    });
    expect(result).toHaveLength(0);
  });

  it("includes booking from a different event even when times match (no exclusion)", () => {
    const booking = makeBooking(slotStart, slotEnd, { eventId: "event-other" });
    const result = filterConflictsForSlot([booking], slotStart, slotEnd, {
      eventId: "event-xyz",
    });
    expect(result).toHaveLength(1);
  });

  it("applies existing booking's bufferAfterMinutes when checking true overlap", () => {
    // Booking ends exactly at slotStart, but has a 15-min buffer.
    // Without buffer: endTime (10:00) <= startTime (10:00) → no overlap.
    // With buffer:    effectiveEnd (10:15) > startTime (10:00) → conflict.
    const booking = makeBooking(
      new Date("2026-06-16T09:00:00.000Z"),
      new Date("2026-06-16T10:00:00.000Z"),
      { bufferAfterMinutes: 15 },
    );
    const result = filterConflictsForSlot([booking], slotStart, slotEnd);
    expect(result).toHaveLength(1);
  });

  it("excludes booking that ends just before slotStart with zero buffer (no overlap)", () => {
    // Booking ends 1 second before slot start — no overlap, no buffer
    const booking = makeBooking(
      new Date("2026-06-16T09:00:00.000Z"),
      new Date("2026-06-16T09:59:59.000Z"),
    );
    expect(filterConflictsForSlot([booking], slotStart, slotEnd)).toHaveLength(0);
  });
});
