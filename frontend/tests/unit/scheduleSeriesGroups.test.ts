import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useScheduleSeriesGroups } from '@/hooks/useScheduleSeriesGroups'
import type { EventScheduleSlot } from '@/types'

// Minimal slot factory — only the fields the grouper reads matter here.
function makeSlot(overrides: Partial<EventScheduleSlot> = {}): EventScheduleSlot {
  return {
    id: 'slot-1',
    eventId: 'event-1',
    startTime: '2026-08-20T14:00:00Z',
    endTime: '2026-08-20T15:00:00Z',
    capacity: null,
    isActive: true,
    isCancelled: false,
    assignedCoachOverride: false,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    assignedCoachId: null,
    recurrenceGroupId: null,
    coachRevealSentAt: null,
    sessionJoinUrl: null,
    timezone: null,
    ...overrides,
  }
}

describe('useScheduleSeriesGroups — timezone', () => {
  it('uses the series recurrenceGroup timezone for a recurring group', () => {
    const slots: EventScheduleSlot[] = [
      makeSlot({
        id: 's1',
        recurrenceGroupId: 'grp-1',
        timezone: 'America/New_York',
        recurrenceGroup: {
          id: 'grp-1',
          frequency: 'WEEKLY',
          timezone: 'America/New_York',
          isContinuous: false,
          isActive: true,
        },
      }),
    ]
    const { result } = renderHook(() => useScheduleSeriesGroups(slots))
    expect(result.current).toHaveLength(1)
    expect(result.current[0].timezone).toBe('America/New_York')
  })

  it("falls back to the slot's own timezone for a one-off slot", () => {
    const slots = [makeSlot({ id: 's2', timezone: 'Asia/Kolkata' })]
    const { result } = renderHook(() => useScheduleSeriesGroups(slots))
    expect(result.current[0].timezone).toBe('Asia/Kolkata')
  })

  it('leaves timezone null for a legacy slot with no stored zone (viewer-zone fallback)', () => {
    const slots = [makeSlot({ id: 's3', timezone: null })]
    const { result } = renderHook(() => useScheduleSeriesGroups(slots))
    expect(result.current[0].timezone).toBeNull()
  })

  it('prefers the series anchor over an individual slot timezone when both are present', () => {
    const slots: EventScheduleSlot[] = [
      makeSlot({
        id: 's4',
        recurrenceGroupId: 'grp-2',
        timezone: 'Asia/Kolkata',
        recurrenceGroup: {
          id: 'grp-2',
          frequency: 'WEEKLY',
          timezone: 'Europe/Berlin',
          isContinuous: false,
          isActive: true,
        },
      }),
    ]
    const { result } = renderHook(() => useScheduleSeriesGroups(slots))
    expect(result.current[0].timezone).toBe('Europe/Berlin')
  })
})
