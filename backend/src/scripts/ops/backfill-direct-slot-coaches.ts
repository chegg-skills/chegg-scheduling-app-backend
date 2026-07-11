/**
 * Backfill for EventScheduleSlot rows left with assignedCoachId: null on DIRECT-strategy,
 * single-coach-group (ONE_TO_MANY-like) events. This happened via two now-fixed bugs:
 * DIRECT events had no per-slot auto-assignment at initial creation (unlike ROUND_ROBIN), and
 * continuous-recurrence replenishment copied assignedCoachId forward from the previous slot
 * instead of using the event's fixedLeadCoachId, perpetuating null indefinitely once introduced.
 *
 * Sets these slots' assignedCoachId to their event's fixedLeadCoachId — the same value new
 * slots on these events already default to going forward.
 *
 *   npm run backfill:direct-slot-coaches -- --dry-run
 *   npm run backfill:direct-slot-coaches -- --apply
 */
import { AssignmentStrategy } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import { INTERACTION_TYPE_CAPS, type InteractionType } from "../../shared/constants/interactionType";

const run = async (apply: boolean): Promise<void> => {
  const candidateEvents = await prisma.event.findMany({
    where: {
      assignmentStrategy: AssignmentStrategy.DIRECT,
      fixedLeadCoachId: { not: null },
      deletedAt: null,
    },
    select: { id: true, name: true, interactionType: true, fixedLeadCoachId: true },
  });

  const eligibleEvents = candidateEvents.filter((e) => {
    const caps = INTERACTION_TYPE_CAPS[e.interactionType as InteractionType];
    return caps?.multipleParticipants === true && !caps?.multipleCoaches;
  });

  if (eligibleEvents.length === 0) {
    console.log("✅ No DIRECT single-coach-group events with a fixedLeadCoachId found.");
    return;
  }

  let totalSlots = 0;
  const perEvent: Array<{ eventId: string; name: string; coachId: string; slotIds: string[] }> = [];

  for (const event of eligibleEvents) {
    const slots = await prisma.eventScheduleSlot.findMany({
      where: { eventId: event.id, assignedCoachId: null, isActive: true, isCancelled: false },
      select: { id: true },
    });
    if (slots.length === 0) continue;
    totalSlots += slots.length;
    perEvent.push({
      eventId: event.id,
      name: event.name,
      coachId: event.fixedLeadCoachId!,
      slotIds: slots.map((s) => s.id),
    });
  }

  if (totalSlots === 0) {
    console.log("✅ No corrupted slots found — nothing to backfill.");
    return;
  }

  console.log(`⚠️  ${totalSlots} slot(s) across ${perEvent.length} event(s) missing assignedCoachId:\n`);
  for (const e of perEvent) {
    console.log(`  event "${e.name}" (${e.eventId}) — ${e.slotIds.length} slot(s) → coach ${e.coachId}`);
  }

  if (!apply) {
    console.log("\nDry run only — no changes made. Re-run with --apply to fix these slots.");
    return;
  }

  for (const e of perEvent) {
    await prisma.eventScheduleSlot.updateMany({
      where: { id: { in: e.slotIds } },
      data: { assignedCoachId: e.coachId },
    });
  }
  console.log(`\n🔁 Fixed ${totalSlots} slot(s).`);
};

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const dryRun = args.includes("--dry-run");

  if (!apply && !dryRun) {
    console.error("Usage: backfill-direct-slot-coaches.ts <--dry-run|--apply>");
    process.exitCode = 1;
    return;
  }

  await run(apply);
};

main()
  .catch((error) => {
    console.error("backfill-direct-slot-coaches failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
