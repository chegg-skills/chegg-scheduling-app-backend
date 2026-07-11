/**
 * Backfill for bookings whose `meetingJoinUrl` was overwritten with a raw coach
 * ISV link by a now-fixed bug in the slot coach-reassignment cascade
 * (eventScheduling.service.ts's updateEventScheduleSlot). Every booking's
 * `meetingJoinUrl` should always be the stable masked redirect
 * (/api/public/bookings/:id/join?t=...) — this restores that invariant for rows
 * corrupted before the fix landed. The fix itself prevents new corruption; it
 * does not retroactively repair existing rows, hence this one-time backfill.
 *
 *   npm run backfill:meeting-join-urls -- --dry-run   # report only, no writes
 *   npm run backfill:meeting-join-urls -- --apply     # apply the fix
 */
import { prisma } from "../../shared/db/prisma";
import { resolveApiBaseUrl } from "../../shared/notifications/notification.publisher";

const run = async (apply: boolean): Promise<void> => {
  const apiBase = resolveApiBaseUrl();

  const bookings = await prisma.booking.findMany({
    where: { sessionToken: { not: null }, status: { not: "CANCELLED" } },
    select: { id: true, sessionToken: true, meetingJoinUrl: true, studentEmail: true },
  });

  const corrupted = bookings.filter((b) => {
    const expected = `${apiBase}/api/public/bookings/${b.id}/join?t=${b.sessionToken}`;
    return b.meetingJoinUrl !== expected;
  });

  if (corrupted.length === 0) {
    console.log("✅ No corrupted meetingJoinUrl values found.");
    return;
  }

  console.log(`⚠️  ${corrupted.length} of ${bookings.length} active booking(s) have a corrupted meetingJoinUrl:\n`);
  for (const b of corrupted) {
    console.log(`  ${b.id}  student=${b.studentEmail}  current=${b.meetingJoinUrl}`);
  }

  if (!apply) {
    console.log("\nDry run only — no changes made. Re-run with --apply to fix these rows.");
    return;
  }

  for (const b of corrupted) {
    const expected = `${apiBase}/api/public/bookings/${b.id}/join?t=${b.sessionToken}`;
    await prisma.booking.update({ where: { id: b.id }, data: { meetingJoinUrl: expected } });
  }
  console.log(`\n🔁 Fixed ${corrupted.length} booking(s) — meetingJoinUrl reset to the masked redirect.`);
};

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const dryRun = args.includes("--dry-run");

  if (!apply && !dryRun) {
    console.error("Usage: backfill-meeting-join-urls.ts <--dry-run|--apply>");
    process.exitCode = 1;
    return;
  }

  await run(apply);
};

main()
  .catch((error) => {
    console.error("backfill-meeting-join-urls failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
