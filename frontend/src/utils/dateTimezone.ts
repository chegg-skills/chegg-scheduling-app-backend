/**
 * Converts a UTC Date to a "YYYY-MM-DDTHH:mm" string in the given IANA timezone.
 * Produces exactly the format that HTML datetime-local inputs expect.
 * Used to pre-fill the slot edit form with the slot's time in the event's timezone.
 *
 * @param utcDate  UTC Date (or ISO string)
 * @param timezone IANA timezone string (e.g. "Asia/Kolkata")
 */
export function utcToZonedString(utcDate: Date | string, timezone: string): string {
  const d = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  // Some Intl implementations return '24' for midnight — normalise to '00'
  const hour = get('hour') === '24' ? '00' : get('hour')
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`
}

/**
 * Interprets a naive "YYYY-MM-DDTHH:mm" string (from a datetime-local input) as
 * wall-clock time in the given IANA timezone and returns the correct UTC instant.
 *
 * Uses the same two-pass Intl.DateTimeFormat approach as startOfDayInTimezone so
 * DST transitions and half-hour UTC offsets (IST +5:30, Nepal +5:45) are handled
 * correctly. For DST spring-forward gaps (the requested wall-clock time does not
 * exist) the result is advanced to the nearest valid instant.
 *
 * @param localDateStr  Naive datetime string "YYYY-MM-DDTHH:mm" (no TZ suffix)
 * @param timezone      IANA timezone string (e.g. "Asia/Kolkata")
 */
export function zonedStringToUTC(localDateStr: string, timezone: string): Date {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  })

  const getParts = (d: Date) => {
    const parts = fmt.formatToParts(d)
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
    const h = get('hour') === '24' ? '00' : get('hour')
    return new Date(`${get('year')}-${get('month')}-${get('day')}T${h}:${get('minute')}:00.000Z`)
  }

  // Step 1: treat the naive string as UTC to anchor the date/time values
  const probe = new Date(localDateStr + ':00.000Z')

  // Step 2: find what this UTC instant looks like in the target timezone,
  //         then compute the offset needed to correct it
  const probeInTz = getParts(probe)
  const offsetMs = probe.getTime() - probeInTz.getTime()
  const result = new Date(probe.getTime() + offsetMs)

  // Step 3: DST correction pass — verify result lands on the intended wall-clock time
  const resultInTz = getParts(result)
  if (resultInTz.getTime() !== probe.getTime()) {
    // Spring-forward gap: intended time doesn't exist — advance to the nearest valid instant
    const driftMs = probe.getTime() - resultInTz.getTime()
    return new Date(result.getTime() + driftMs)
  }

  return result
}

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
