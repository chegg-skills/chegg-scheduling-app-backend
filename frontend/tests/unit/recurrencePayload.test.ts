import { describe, it, expect } from 'vitest'
import { withSeriesTimezone } from '@/components/events/dialogs/recurrencePayload'
import type { RecurrenceConfig } from '@/components/events/dialogs/RecurrenceSelector'

describe('withSeriesTimezone', () => {
  it('attaches the timezone to a recurrence config, preserving the other fields', () => {
    const recurrence: RecurrenceConfig = { frequency: 'WEEKLY', occurrences: 4, isContinuous: false }

    const result = withSeriesTimezone(recurrence, 'America/New_York')

    expect(result).toEqual({
      frequency: 'WEEKLY',
      occurrences: 4,
      isContinuous: false,
      timezone: 'America/New_York',
    })
  })

  it('overrides any existing timezone with the supplied one', () => {
    const recurrence: RecurrenceConfig = {
      frequency: 'WEEKLY',
      occurrences: 1,
      timezone: 'UTC',
    }
    expect(withSeriesTimezone(recurrence, 'Europe/Berlin')?.timezone).toBe('Europe/Berlin')
  })

  it('returns null unchanged when there is no recurrence (a single slot needs no anchor)', () => {
    expect(withSeriesTimezone(null, 'America/New_York')).toBeNull()
  })

  it('passes through the real browser timezone the dialog would send', () => {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const result = withSeriesTimezone({ frequency: 'BI_WEEKLY', occurrences: 2 }, browserTz)
    expect(result?.timezone).toBe(browserTz)
  })
})
