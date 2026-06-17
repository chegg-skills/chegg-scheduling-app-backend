import { useState, useEffect } from 'react'
import type { Booking } from '@/types'
import { useConfirm } from '@/context/confirm'
import { useBookingSessionLog, useUpsertBookingSessionLog } from '@/hooks/queries/useBookingLog'
import { usePermissions } from '@/hooks/usePermissions'
import { extractApiError } from '@/utils/apiError'

/**
 * Owns the session-log state for a booking: on-demand log fetch, edit-mode
 * toggling, form-field prefill (from the fetched log or sensible defaults), and
 * the save mutation. Behavior is unchanged from the original inline logic in
 * BookingDetailsRightSection.
 */
export function useSessionLogDraft(booking: Booking) {
  const { isCoach, isAdmin } = usePermissions()
  const canSeePrivateNotes = isCoach || isAdmin

  const [isEditing, setIsEditing] = useState(false)

  // Fetch the log on demand.
  const { data: fetchedLog, isLoading } = useBookingSessionLog(booking.id)
  const log = fetchedLog ?? booking.sessionLog ?? booking.scheduleSlot?.sessionLog ?? null

  const isOneOnOne = !booking.scheduleSlotId
  const sessionStarted = new Date(booking.startTime).getTime() <= Date.now()
  const canLog = (isCoach || isAdmin) && isOneOnOne && sessionStarted

  const { mutate: upsertLog, isPending } = useUpsertBookingSessionLog(booking.id)
  const { alert } = useConfirm()

  const [topicsDiscussed, setTopicsDiscussed] = useState('')
  const [summary, setSummary] = useState('')
  const [coachNotes, setCoachNotes] = useState('')
  const [attended, setAttended] = useState(true)

  // Set default edit state if no log exists and the user can log
  useEffect(() => {
    if (!isLoading && !log && canLog) {
      setIsEditing(true)
    } else {
      setIsEditing(false)
    }
  }, [isLoading, log, canLog])

  // Prepopulate form states when log details are fetched
  useEffect(() => {
    if (log) {
      setTopicsDiscussed(log.topicsDiscussed ?? '')
      setSummary(log.summary ?? '')
      setCoachNotes(log.coachNotes ?? '')
      const wasPresent = log.attendance?.[0]?.attended ?? true
      setAttended(wasPresent)
    } else {
      setTopicsDiscussed('')
      setSummary('')
      setCoachNotes('')
      setAttended(booking.status !== 'NO_SHOW')
    }
  }, [log, booking.status])

  const handleSave = () => {
    upsertLog(
      {
        topicsDiscussed: topicsDiscussed.trim() || null,
        summary: summary.trim() || null,
        coachNotes: coachNotes.trim() || null,
        attended,
      },
      {
        onSuccess: () => {
          setIsEditing(false)
        },
        onError: (err) => {
          alert({
            title: 'Save failed',
            message: extractApiError(err) || 'Failed to save session log. Please try again.',
          })
        },
      }
    )
  }

  return {
    canSeePrivateNotes,
    log,
    canLog,
    isLoading,
    isEditing,
    setIsEditing,
    isPending,
    topicsDiscussed,
    setTopicsDiscussed,
    summary,
    setSummary,
    coachNotes,
    setCoachNotes,
    attended,
    setAttended,
    handleSave,
  }
}

export type SessionLogDraft = ReturnType<typeof useSessionLogDraft>
