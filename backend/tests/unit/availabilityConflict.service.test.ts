import { createAvailabilityConflictService } from "../../src/domain/availability/availabilityConflict.service";
import type { AvailabilityConflictRepository } from "../../src/domain/availability/availabilityConflict.repository";

const MIN = 60 * 1000;
const at = (minutes: number) => new Date(Date.UTC(2026, 5, 1, 12, 0) + minutes * MIN);

const booking = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "b",
    startTime: at(0),
    endTime: at(30),
    event: { bufferAfterMinutes: 0 },
    ...overrides,
  }) as never;

const makeRepo = (
  overrides: Partial<AvailabilityConflictRepository> = {},
): AvailabilityConflictRepository => ({
  findBookingsWithEvent: jest.fn().mockResolvedValue([]),
  findAssignedSlots: jest.fn().mockResolvedValue([]),
  ...overrides,
});

const fakeTx = { __fake: true } as never;

describe("createAvailabilityConflictService (fake repository)", () => {
  describe("getCoachConflicts — what it asks the database", () => {
    it("looks for the coach's (or co-coach's) confirmed/pending bookings in a window that reaches 120 minutes back", async () => {
      const repo = makeRepo();
      await createAvailabilityConflictService(repo).getCoachConflicts("u-1", at(60), at(90));

      const where = (repo.findBookingsWithEvent as jest.Mock).mock.calls[0][0];
      expect(where.OR).toEqual([{ coachUserId: "u-1" }, { coCoachUserIds: { has: "u-1" } }]);
      expect(where.status).toEqual({ in: ["CONFIRMED", "PENDING"] });
      expect(where.AND[0]).toEqual({ startTime: { lt: at(90) }, endTime: { gt: at(60 - 120) } });
      expect(where).not.toHaveProperty("id");
    });

    it("can exclude the booking being rescheduled", async () => {
      const repo = makeRepo();
      await createAvailabilityConflictService(repo).getCoachConflicts("u-1", at(60), at(90), {
        excludeBookingId: "b-self",
      });
      expect((repo.findBookingsWithEvent as jest.Mock).mock.calls[0][0].id).toEqual({
        not: "b-self",
      });
    });

    it("adds the same-session exclusion only when an event is given", async () => {
      const repo = makeRepo();
      const service = createAvailabilityConflictService(repo);
      await service.getCoachConflicts("u-1", at(60), at(90));
      await service.getCoachConflicts("u-1", at(60), at(90), { eventId: "e-1" });
      const [without, withEvent] = (repo.findBookingsWithEvent as jest.Mock).mock.calls.map(
        (c) => c[0].AND,
      );
      expect(without).toHaveLength(1);
      expect(withEvent).toHaveLength(2);
      expect(withEvent[1]).toEqual({ NOT: { eventId: "e-1", startTime: at(60), endTime: at(90) } });
    });

    it("also checks the coach's pinned schedule slots, skipping the slot being booked", async () => {
      const repo = makeRepo();
      const service = createAvailabilityConflictService(repo);
      await service.getCoachConflicts("u-1", at(60), at(90));
      await service.getCoachConflicts("u-1", at(60), at(90), { scheduleSlotId: "slot-1" });
      const [plain, withSlot] = (repo.findAssignedSlots as jest.Mock).mock.calls.map((c) => c[0]);
      expect(plain).toMatchObject({
        assignedCoachId: "u-1",
        isActive: true,
        isCancelled: false,
        startTime: { lt: at(90) },
        endTime: { gt: at(60 - 120) },
      });
      expect(plain).not.toHaveProperty("NOT");
      expect(withSlot.NOT).toEqual({ id: "slot-1" });
    });
  });

  describe("getCoachConflicts — transaction handling", () => {
    it("runs BOTH queries on the caller's transaction when one is supplied", async () => {
      const repo = makeRepo();
      await createAvailabilityConflictService(repo).getCoachConflicts("u-1", at(60), at(90), {
        tx: fakeTx,
      });
      expect((repo.findBookingsWithEvent as jest.Mock).mock.calls[0][1]).toBe(fakeTx);
      expect((repo.findAssignedSlots as jest.Mock).mock.calls[0][1]).toBe(fakeTx);
    });

    it("uses the default client (no tx) otherwise", async () => {
      const repo = makeRepo();
      await createAvailabilityConflictService(repo).getCoachConflicts("u-1", at(60), at(90));
      expect((repo.findBookingsWithEvent as jest.Mock).mock.calls[0][1]).toBeUndefined();
      expect((repo.findAssignedSlots as jest.Mock).mock.calls[0][1]).toBeUndefined();
    });
  });

  describe("getCoachConflicts — which results count as conflicts", () => {
    const run = (bookings: unknown[], slots: unknown[] = []) =>
      createAvailabilityConflictService(
        makeRepo({
          findBookingsWithEvent: jest.fn().mockResolvedValue(bookings),
          findAssignedSlots: jest.fn().mockResolvedValue(slots),
        }),
      ).getCoachConflicts("u-1", at(60), at(90));

    it("keeps a booking that truly overlaps", async () => {
      expect(await run([booking({ startTime: at(70), endTime: at(100) })])).toHaveLength(1);
    });
    it("drops a booking that ends before the new one starts", async () => {
      expect(await run([booking({ startTime: at(0), endTime: at(50) })])).toHaveLength(0);
    });
    it("counts the existing booking's after-buffer", async () => {
      const buffered = booking({
        startTime: at(0),
        endTime: at(50),
        event: { bufferAfterMinutes: 15 },
      });
      expect(await run([buffered])).toHaveLength(1);
    });
    it("drops a booking that starts after the new one ends", async () => {
      expect(await run([booking({ startTime: at(90), endTime: at(120) })])).toHaveLength(0);
    });
    it("treats a pinned slot as a conflict, reshaping it like a booking (missing buffer = 0)", async () => {
      const slot = {
        id: "slot-9",
        startTime: at(70),
        endTime: at(100),
        eventId: "e-9",
        event: { bufferAfterMinutes: null },
      };
      const [conflict] = (await run([], [slot])) as unknown as Array<Record<string, unknown>>;
      expect(conflict).toMatchObject({
        scheduleSlotId: "slot-9",
        eventId: "e-9",
        event: { bufferAfterMinutes: null },
      });
    });
    it("returns bookings before slots", async () => {
      const slot = {
        id: "s",
        startTime: at(70),
        endTime: at(100),
        eventId: "e",
        event: { bufferAfterMinutes: 0 },
      };
      const result = (await run(
        [booking({ id: "b-1", startTime: at(70), endTime: at(100) })],
        [slot],
      )) as unknown as Array<{ id?: string; scheduleSlotId?: string }>;
      expect(result.map((r) => r.id ?? r.scheduleSlotId)).toEqual(["b-1", "s"]);
    });
  });

  describe("isConflictBlocking", () => {
    it("is false with no conflicts and true with any", () => {
      const { isConflictBlocking } = createAvailabilityConflictService(makeRepo());
      expect(isConflictBlocking([])).toBe(false);
      expect(isConflictBlocking([booking()])).toBe(true);
    });
  });
});
