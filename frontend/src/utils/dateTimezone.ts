/**
 * Computes the UTC timestamp of local midnight for a given calendar date in
 * the specified IANA timezone. Uses a two-pass Intl.DateTimeFormat approach so
 * that DST transition days (where noon's UTC offset differs from midnight's) are
 * handled correctly without relying on locale-specific string formats.
 *
 * @param year  Full year (e.g. 2026)
 * @param month 0-indexed month (0 = January), matching Date.getMonth()
 * @param day   Day of month (1-based)
 * @param tz    IANA timezone string (e.g. "Asia/Kolkata")
 */
export function startOfDayInTimezone(year: number, month: number, day: number, tz: string): Date {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parseHMS = (utcMs: number) => {
    const parts = fmt.formatToParts(new Date(utcMs))
    const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10)
    return { h: get('hour') % 24, m: get('minute'), sec: get('second') }
  }
  // Anchor at noon UTC — guaranteed to fall on the correct calendar day for
  // any UTC offset in the range UTC-12 to UTC+14.
  let utcMs = Date.UTC(year, month, day, 12, 0, 0)
  // Pass 1: subtract the local HMS from noon to land near local midnight.
  const { h: h1, m: m1, sec: s1 } = parseHMS(utcMs)
  utcMs -= (h1 * 3600 + m1 * 60 + s1) * 1000
  // Pass 2: correct for DST transition days where noon's offset ≠ midnight's offset.
  const { h: h2, m: m2, sec: s2 } = parseHMS(utcMs)
  if (h2 !== 0 || m2 !== 0 || s2 !== 0) {
    if (h2 > 12) {
      // Overshot backward into previous-day evening — advance to midnight.
      utcMs += (24 - h2) * 3_600_000 - m2 * 60_000 - s2 * 1000
    } else {
      // Landed slightly past midnight — subtract the remainder.
      utcMs -= (h2 * 3600 + m2 * 60 + s2) * 1000
    }
  }
  return new Date(utcMs)
}
