/**
 * Ops tooling for the notification outbox dead-letter queue.
 *
 *   npm run outbox:inspect            # list dead-lettered notifications
 *   npm run outbox:reset              # reset ALL dead-lettered rows for retry
 *   npm run outbox:reset -- <outboxId> [<outboxId> ...]   # reset specific rows (ids from inspect)
 *
 * A row dead-letters after MAX_ATTEMPTS failed publishes (e.g. a prolonged
 * RabbitMQ outage). Once RabbitMQ is healthy again, `reset` clears `attempts`
 * and `deadLetteredAt` so the worker picks the row up on its next pass.
 */
import { prisma } from "../../shared/db/prisma";

const inspect = async (): Promise<void> => {
  const rows = await prisma.outboxNotification.findMany({
    where: { deadLetteredAt: { not: null } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      type: true,
      entityType: true,
      entityId: true,
      attempts: true,
      lastError: true,
      createdAt: true,
      deadLetteredAt: true,
    },
  });

  if (rows.length === 0) {
    console.log("✅ No dead-lettered notifications.");
    return;
  }

  console.log(`⚠️  ${rows.length} dead-lettered notification(s):\n`);
  for (const r of rows) {
    const entity = r.entityId ? `${r.entityType ?? "?"}:${r.entityId}` : "(none)";
    console.log(
      `  ${r.id}  type=${r.type}  entity=${entity}  attempts=${r.attempts}\n` +
        `    created=${r.createdAt.toISOString()}  deadLettered=${r.deadLetteredAt?.toISOString()}\n` +
        `    lastError=${r.lastError ?? "(none)"}\n`,
    );
  }
};

const reset = async (outboxIds: string[]): Promise<void> => {
  const where =
    outboxIds.length > 0
      ? { deadLetteredAt: { not: null }, id: { in: outboxIds } }
      : { deadLetteredAt: { not: null } };

  const { count } = await prisma.outboxNotification.updateMany({
    where,
    data: { attempts: 0, deadLetteredAt: null, claimedAt: null, lastError: null },
  });

  const scope = outboxIds.length > 0 ? `for id(s) ${outboxIds.join(", ")}` : "(all)";
  console.log(`🔁 Reset ${count} dead-lettered notification(s) ${scope}. The worker will retry them.`);
};

const main = async (): Promise<void> => {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case "inspect":
      await inspect();
      break;
    case "reset":
      await reset(args);
      break;
    default:
      console.error("Usage: resetOutbox.ts <inspect|reset> [bookingId ...]");
      process.exitCode = 1;
  }
};

main()
  .catch((error) => {
    console.error("resetOutbox failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
