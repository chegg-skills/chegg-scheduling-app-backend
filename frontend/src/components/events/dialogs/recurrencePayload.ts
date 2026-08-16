import type { RecurrenceConfig } from './RecurrenceSelector'

/**
 * Attaches the timezone the start time was entered in to a recurrence config, so
 * the backend anchors the series and keeps each occurrence at the same local time
 * across DST (see backend recurrence.service). Returns `null` unchanged when there
 * is no recurrence — a single slot needs no anchor.
 */
export function withSeriesTimezone(
  recurrence: RecurrenceConfig | null,
  timezone: string,
): RecurrenceConfig | null {
  return recurrence ? { ...recurrence, timezone } : recurrence
}
