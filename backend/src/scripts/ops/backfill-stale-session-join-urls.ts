/**
 * Backfill for EventScheduleSlot.sessionJoinUrl values left stale after a coach
 * reassignment on an already-revealed slot. sessionJoinUrl is frozen once, at reveal
 * time (revealCoachForSlot), and resolveBookingJoinRedirect prioritizes that frozen
 * snapshot over live data — so reassigning the coach after reveal (before
 * updateEventScheduleSlot's fix that nulls sessionJoinUrl on reassignment) left the
 * public join redirect pointing at the coach who held the slot when reveal was sent,
 * not the currently assigned one, even though the coach's name elsewhere (email,
 * admin UI) was already correctly showing the new coach.
 *
 * For every revealed slot, recomputes what sessionJoinUrl *should* currently resolve
 * to (via the same getMeetingJoinUrl helper the live fallback uses) and nulls the
 * stored value only when it no longer matches — genuinely stale snapshots are
 * cleared (letting the live resolver take over going forward), while a slot whose
 * sessionJoinUrl still matches the current coach (including a legitimate custom
 * override entered via the reveal API that happens to differ from the coach's own
 * Zoom link) is left untouched.
 *
 *   npm run backfill:stale-session-join-urls -- --dry-run
 *   npm run backfill:stale-session-join-urls -- --apply
 */
import { prisma } from "../../shared/db/prisma";
import { getMeetingJoinUrl } from "../../domain/bookings/booking.shared";

export const run = async (apply: boolean): Promise<void> => {
  const revealedSlots = await prisma.eventScheduleSlot.findMany({
    where: { coachRevealSentAt: { not: null }, sessionJoinUrl: { not: null } },
    select: {
      id: true,
      sessionJoinUrl: true,
      event: { select: { id: true, name: true, meetingLinkSource: true, locationValue: true } },
      assignedCoach: { select: { id: true, zoomIsvLink: true } },
    },
  });

  if (revealedSlots.length === 0) {
    console.log("✅ No revealed slots with a stored sessionJoinUrl found — nothing to check.");
    return;
  }

  const staleSlotIds: string[] = [];
  const staleDetails: Array<{ slotId: string; eventName: string; stored: string; expected: string | null }> = [];

  for (const slot of revealedSlots) {
    const expected = getMeetingJoinUrl(slot.event, slot.assignedCoach?.zoomIsvLink ?? null);
    if (expected !== slot.sessionJoinUrl) {
      staleSlotIds.push(slot.id);
      staleDetails.push({
        slotId: slot.id,
        eventName: slot.event.name,
        stored: slot.sessionJoinUrl!,
        expected,
      });
    }
  }

  if (staleSlotIds.length === 0) {
    console.log(`✅ Checked ${revealedSlots.length} revealed slot(s) — all sessionJoinUrl values are current.`);
    return;
  }

  console.log(`⚠️  ${staleSlotIds.length} of ${revealedSlots.length} revealed slot(s) have a stale sessionJoinUrl:\n`);
  for (const d of staleDetails) {
    console.log(`  slot ${d.slotId} (event "${d.eventName}") — stored: ${d.stored} | expected: ${d.expected ?? "(none)"}`);
  }

  if (!apply) {
    console.log("\nDry run only — no changes made. Re-run with --apply to clear these stale snapshots.");
    return;
  }

  await prisma.eventScheduleSlot.updateMany({
    where: { id: { in: staleSlotIds } },
    data: { sessionJoinUrl: null },
  });
  console.log(`\n🔁 Cleared ${staleSlotIds.length} stale sessionJoinUrl value(s).`);
};

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const dryRun = args.includes("--dry-run");

  if (!apply && !dryRun) {
    console.error("Usage: backfill-stale-session-join-urls.ts <--dry-run|--apply>");
    process.exitCode = 1;
    return;
  }

  await run(apply);
};

if (require.main === module) {
  main()
    .catch((error) => {
      console.error("backfill-stale-session-join-urls failed:", error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
