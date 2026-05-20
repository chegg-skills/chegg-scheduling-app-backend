import { describe, it, expect } from 'vitest'
import { startOfDayInTimezone } from '@/utils/dateTimezone'

describe('startOfDayInTimezone', () => {
  const formatLocal = (date: Date, tz: string) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date)

  it('returns 00:00:00 for a standard UTC date', () => {
    const result = startOfDayInTimezone(2026, 0, 1, 'UTC')
    expect(formatLocal(result, 'UTC')).toBe('00:00:00')
    expect(result.toISOString()).toBe('2026-01-01T00:00:00.000Z')
  })

  it('returns 00:00:00 in IST (UTC+5:30 — half-hour offset)', () => {
    // 2026-01-01 00:00:00 IST = 2025-12-31 18:30:00 UTC
    const result = startOfDayInTimezone(2026, 0, 1, 'Asia/Kolkata')
    expect(formatLocal(result, 'Asia/Kolkata')).toBe('00:00:00')
    expect(result.toISOString()).toBe('2025-12-31T18:30:00.000Z')
  })

  it('returns 00:00:00 in Nepal (UTC+5:45 — quarter-hour offset)', () => {
    // 2026-01-01 00:00:00 NPT = 2025-12-31 18:15:00 UTC
    const result = startOfDayInTimezone(2026, 0, 1, 'Asia/Kathmandu')
    expect(formatLocal(result, 'Asia/Kathmandu')).toBe('00:00:00')
    expect(result.toISOString()).toBe('2025-12-31T18:15:00.000Z')
  })

  it('returns 00:00:00 on a US spring-forward DST day (America/New_York, 2026-03-08)', () => {
    // 2026-03-08: clocks spring forward from 02:00 EST to 03:00 EDT.
    const result = startOfDayInTimezone(2026, 2, 8, 'America/New_York')
    expect(formatLocal(result, 'America/New_York')).toBe('00:00:00')
  })

  it('returns 00:00:00 on a US fall-back DST day (America/New_York, 2026-11-01)', () => {
    // 2026-11-01: clocks fall back from 02:00 EDT to 01:00 EST.
    const result = startOfDayInTimezone(2026, 10, 1, 'America/New_York')
    expect(formatLocal(result, 'America/New_York')).toBe('00:00:00')
  })

  it('returns 00:00:00 for UTC+14 (Pacific/Kiritimati)', () => {
    const result = startOfDayInTimezone(2026, 0, 1, 'Pacific/Kiritimati')
    expect(formatLocal(result, 'Pacific/Kiritimati')).toBe('00:00:00')
  })

  it('correctly handles month rollover (day+1 across month boundary)', () => {
    // Jan 31 + 1 day = Feb 1 — Date.UTC handles this automatically
    const jan31 = startOfDayInTimezone(2026, 0, 31, 'America/New_York')
    const feb01 = startOfDayInTimezone(2026, 0, 32, 'America/New_York') // day=32 → Feb 1
    expect(feb01.getTime() - jan31.getTime()).toBe(24 * 60 * 60 * 1000)
  })

  it('end-of-day helper: (next day start - 1ms) equals 23:59:59.999 in that timezone', () => {
    const d1Start = startOfDayInTimezone(2026, 0, 1, 'Asia/Kolkata')
    const d2Start = startOfDayInTimezone(2026, 0, 2, 'Asia/Kolkata')
    const endOfDay = new Date(d2Start.getTime() - 1)
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(endOfDay)
    const get = (t: string) => parts.find((p) => p.type === t)?.value
    expect(get('hour')).toBe('23')
    expect(get('minute')).toBe('59')
    expect(get('second')).toBe('59')
    // Sanity: exactly 24 hours between the two day starts
    expect(d2Start.getTime() - d1Start.getTime()).toBe(24 * 60 * 60 * 1000)
  })
})
