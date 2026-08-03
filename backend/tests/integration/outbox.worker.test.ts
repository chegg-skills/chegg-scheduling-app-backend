import { Prisma } from "@prisma/client";
import { prisma } from "../../src/shared/db/prisma";
import { processOutbox } from "../../src/shared/notifications/outbox.worker";
import { publishNotification } from "../../src/shared/notifications/notification.publisher";

// The worker publishes via `publishNotification`; mock it so we can drive success /
// transient-failure / permanent-failure without a real RabbitMQ.
jest.mock("../../src/shared/notifications/notification.publisher", () => ({
  publishNotification: jest.fn(),
}));

const mockPublish = publishNotification as jest.Mock;

type SeedOverrides = {
  payload?: Prisma.InputJsonValue;
  notificationKey?: string | null;
  attempts?: number;
  claimedAt?: Date | null;
  processedAt?: Date | null;
  deadLetteredAt?: Date | null;
};

const seedRow = (overrides: SeedOverrides = {}) =>
  prisma.outboxNotification.create({
    data: {
      type: "BOOKING_CONFIRMED",
      payload:
        overrides.payload ??
        ({ type: "BOOKING_CONFIRMED", recipients: "student@test.com", variables: {} } as Prisma.InputJsonValue),
      notificationKey: overrides.notificationKey ?? null,
      attempts: overrides.attempts ?? 0,
      claimedAt: overrides.claimedAt ?? null,
      processedAt: overrides.processedAt ?? null,
      deadLetteredAt: overrides.deadLetteredAt ?? null,
    },
  });

const reload = (id: string) =>
  prisma.outboxNotification.findUniqueOrThrow({ where: { id } });

beforeEach(async () => {
  await prisma.outboxNotification.deleteMany();
  mockPublish.mockReset();
});

afterAll(async () => {
  await prisma.outboxNotification.deleteMany();
  await prisma.$disconnect();
});

describe("outbox worker — processOutbox", () => {
  it("marks a row processed on successful publish", async () => {
    mockPublish.mockResolvedValue(true);
    const row = await seedRow();

    await processOutbox();

    const updated = await reload(row.id);
    expect(updated.processedAt).not.toBeNull();
    expect(updated.attempts).toBe(0);
    expect(updated.deadLetteredAt).toBeNull();
    expect(mockPublish).toHaveBeenCalledTimes(1);
  });

  it("records a failure (attempts++, lastError) without processing when publish throws", async () => {
    mockPublish.mockRejectedValue(new Error("RabbitMQ unavailable"));
    const row = await seedRow();

    await processOutbox();

    const updated = await reload(row.id);
    expect(updated.processedAt).toBeNull();
    expect(updated.attempts).toBe(1);
    expect(updated.lastError).toContain("RabbitMQ unavailable");
    expect(updated.deadLetteredAt).toBeNull();
  });

  it("treats publish returning false as a failure", async () => {
    mockPublish.mockResolvedValue(false);
    const row = await seedRow();

    await processOutbox();

    const updated = await reload(row.id);
    expect(updated.processedAt).toBeNull();
    expect(updated.attempts).toBe(1);
    expect(updated.lastError).toContain("publish returned false");
  });

  it("dead-letters a row after the 5th (MAX_ATTEMPTS) failed attempt", async () => {
    mockPublish.mockRejectedValue(new Error("still down"));
    const row = await seedRow({ attempts: 4 });

    await processOutbox();

    const updated = await reload(row.id);
    expect(updated.attempts).toBe(5);
    expect(updated.deadLetteredAt).not.toBeNull();
    expect(updated.processedAt).toBeNull();
  });

  it("skips already-processed and dead-lettered rows", async () => {
    mockPublish.mockResolvedValue(true);
    await seedRow({ processedAt: new Date() });
    await seedRow({ deadLetteredAt: new Date(), attempts: 5 });
    const claimable = await seedRow();

    await processOutbox();

    expect(mockPublish).toHaveBeenCalledTimes(1); // only the one claimable row
    expect((await reload(claimable.id)).processedAt).not.toBeNull();
  });

  it("does not re-claim a row whose lease is still active", async () => {
    // Pass 1: publish fails, so the row is claimed (claimedAt = DB now()) and left pending.
    // Deriving the lease from the DB avoids any Node-vs-Postgres clock skew at the 5-min boundary.
    mockPublish.mockRejectedValue(new Error("down"));
    const row = await seedRow();
    await processOutbox();
    expect((await reload(row.id)).attempts).toBe(1);

    // Pass 2 immediately after: the lease is still fresh, so the row must be skipped.
    mockPublish.mockReset();
    mockPublish.mockResolvedValue(true);
    await processOutbox();

    expect(mockPublish).not.toHaveBeenCalled();
    expect((await reload(row.id)).processedAt).toBeNull();
  });

  it("reclaims a row whose lease has expired (crashed-worker recovery)", async () => {
    mockPublish.mockResolvedValue(true);
    const stale = await seedRow({ claimedAt: new Date(Date.now() - 10 * 60 * 1000) }); // well past the 5-min lease

    await processOutbox();

    expect((await reload(stale.id)).processedAt).not.toBeNull();
  });

  it("stamps a default idempotency key (outbox:<id>) when the payload has none", async () => {
    mockPublish.mockResolvedValue(true);
    const row = await seedRow({
      payload: { type: "BOOKING_CONFIRMED", recipients: "student@test.com" } as Prisma.InputJsonValue,
    });

    await processOutbox();

    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({ notificationKey: `outbox:${row.id}` }),
    );
  });

  it("preserves an explicit notificationKey from the payload", async () => {
    mockPublish.mockResolvedValue(true);
    await seedRow({
      payload: {
        type: "BOOKING_CONFIRMED",
        recipients: "student@test.com",
        notificationKey: "caller-supplied-key",
      } as Prisma.InputJsonValue,
    });

    await processOutbox();

    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({ notificationKey: "caller-supplied-key" }),
    );
  });
});
