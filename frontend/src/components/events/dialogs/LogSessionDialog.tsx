import { useState, useEffect, useMemo } from 'react'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Select } from '@/components/shared/form/Select'
import { format } from 'date-fns'
import { Modal } from '@/components/shared/ui/Modal'
import { Button } from '@/components/shared/ui/Button'
import { LogSessionParticipantList } from './LogSessionParticipantList'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import { Textarea } from '@/components/shared/form/Textarea'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { useSlotBookings, useSlotSessionLog, useUpsertSessionLog } from '@/hooks/queries/useEvents'
import type { Event, EventScheduleSlot, Booking } from '@/types'
import { extractApiError } from '@/utils/apiError'

interface LogSessionDialogProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  slot: EventScheduleSlot | null
  event?: Event
  readOnly?: boolean
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function LogSessionDialog({ isOpen, onClose, eventId, slot, event, readOnly }: LogSessionDialogProps) {
  const slotId = slot?.id ?? ''
  const isAnonymous = event?.allowAnonymousBooking === true

  const { data: bookings, isLoading: bookingsLoading } = useSlotBookings(eventId, slotId)
  const { data: existingLog, isLoading: logLoading } = useSlotSessionLog(eventId, slotId)
  const { mutate: upsertLog, isPending, error: submitError, reset: resetMutation } = useUpsertSessionLog(eventId, slotId)

  const [hasStarted, setHasStarted] = useState(() => (slot ? new Date(slot.startTime) <= new Date() : false))

  const [topicsDiscussed, setTopicsDiscussed] = useState('')
  const [summary, setSummary] = useState('')
  const [coachNotes, setCoachNotes] = useState('')
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({})
  const [assignedCoachId, setAssignedCoachId] = useState<string>('')

  const activeBookings = useMemo(
    () => (bookings as Booking[] | undefined)?.filter((b) => b.status !== 'CANCELLED') ?? [],
    [bookings]
  )

  useEffect(() => {
    if (!isOpen || !slot) return
    const msUntilStart = new Date(slot.startTime).getTime() - Date.now()
    if (msUntilStart <= 0) {
      setHasStarted(true)
      return
    }
    const timer = setTimeout(() => setHasStarted(true), msUntilStart)
    return () => clearTimeout(timer)
  }, [isOpen, slot?.startTime])

  useEffect(() => {
    if (!isOpen) return

    resetMutation()
    setHasStarted(slot ? new Date(slot.startTime) <= new Date() : false)
    setAssignedCoachId(slot?.assignedCoachId ?? '')

    if (existingLog) {
      setTopicsDiscussed(existingLog.topicsDiscussed ?? '')
      setSummary(existingLog.summary ?? '')
      setCoachNotes(existingLog.coachNotes ?? '')
      const map: Record<string, boolean> = {}
      existingLog.attendance.forEach((a) => {
        map[a.bookingId] = a.attended
      })
      // For any active booking not yet in existingLog.attendance (e.g. added after initial log),
      // default them to present so they don't silently show as absent
      activeBookings.forEach((b) => {
        if (!(b.id in map)) map[b.id] = true
      })
      setAttendanceMap(map)
    } else if (activeBookings.length > 0) {
      // New log — default everyone to present
      setTopicsDiscussed('')
      setSummary('')
      setCoachNotes('')
      const map: Record<string, boolean> = {}
      activeBookings.forEach((b) => {
        map[b.id] = true
      })
      setAttendanceMap(map)
    } else {
      setTopicsDiscussed('')
      setSummary('')
      setCoachNotes('')
      setAttendanceMap({})
    }
  }, [isOpen, existingLog, activeBookings, slot?.assignedCoachId])

  const attendedCount = activeBookings.filter((b) => attendanceMap[b.id] === true).length
  const absentCount = activeBookings.filter((b) => attendanceMap[b.id] === false).length

  const handleSave = () => {
    const attendance = activeBookings.map((b) => ({
      bookingId: b.id,
      attended: attendanceMap[b.id] ?? false,
    }))

    upsertLog(
      {
        topicsDiscussed: topicsDiscussed.trim() || null,
        summary: summary.trim() || null,
        coachNotes: coachNotes.trim() || null,
        attendance,
        ...(isAnonymous && assignedCoachId ? { assignedCoachId } : {}),
      },
      {
        onSuccess: () => {
          onClose()
        },
      }
    )
  }

  const dateStr = slot ? format(new Date(slot.startTime), 'EEE, MMM d, yyyy') : ''
  const timeStr = slot
    ? `${format(new Date(slot.startTime), 'h:mm a')} – ${format(new Date(slot.endTime), 'h:mm a')}`
    : ''

  const coachName = slot?.assignedCoach
    ? `${slot.assignedCoach.firstName} ${slot.assignedCoach.lastName}`.trim()
    : 'Team Pool'

  const isLoading = bookingsLoading || logLoading

  const footer = readOnly ? (
    <Stack direction="row" justifyContent="flex-end" width="100%">
      <Button variant="secondary" onClick={onClose}>
        Close
      </Button>
    </Stack>
  ) : (
    <Stack direction="row" justifyContent="space-between" alignItems="center" width="100%">
      <Typography variant="caption" color="text.secondary">
        {attendedCount} attended · {absentCount} absent
      </Typography>
      <Stack direction="row" spacing={1}>
        <Button variant="secondary" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleSave} isLoading={isPending} disabled={isPending || isLoading || !hasStarted}>
          {existingLog ? 'Update Log' : 'Save Log'}
        </Button>
      </Stack>
    </Stack>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={readOnly ? 'Session Log' : 'Log Session'} size="md" footer={footer}>
      <Stack spacing={3} sx={{ mt: 1 }}>
        {!hasStarted && !readOnly ? (
          <ErrorAlert
            severity="info"
            title="Session Has Not Started"
            message={`You will be able to log this session once it starts on ${dateStr} at ${slot ? format(new Date(slot.startTime), 'h:mm a') : ''}.`}
          />
        ) : submitError ? (
          <ErrorAlert
            severity="error"
            title="Save Failed"
            message={extractApiError(submitError) || 'Failed to save session log. Please try again.'}
          />
        ) : null}

        {/* Session header banner */}
        <Box
          sx={{
            p: 2,
            bgcolor: '#FFF6F0',
            border: '1px solid #DEE3ED',
            borderRadius: 1.5,
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>
                {dateStr}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {timeStr}
              </Typography>
            </Box>
            <Stack alignItems="flex-end" spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    fontSize: '0.7rem',
                    bgcolor: 'primary.main',
                  }}
                >
                  {getInitials(coachName)}
                </Avatar>
                <Typography variant="body2" fontWeight={600}>
                  {coachName}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Session Coach
              </Typography>
            </Stack>
          </Stack>
        </Box>

        {/* Coach assignment — only for anonymous events */}
        {isAnonymous && (
          <FormField
            label="Assign Coach"
            htmlFor="log-coach"
            hint="Optional — Assigning a coach updates the slot record and all bookings retroactively."
          >
            <Select
              id="log-coach"
              value={assignedCoachId}
              onChange={(e) => setAssignedCoachId(e.target.value as string)}
              disabled={readOnly}
            >
              <MenuItem value="">
                <em>— Not assigned —</em>
              </MenuItem>
              {(event?.coaches ?? [])
                .filter((c) => c.isActive || c.coachUserId === assignedCoachId)
                .map((c) => (
                  <MenuItem key={c.coachUserId} value={c.coachUserId}>
                    {c.coachUser.firstName} {c.coachUser.lastName}
                  </MenuItem>
                ))}
            </Select>
          </FormField>
        )}

        {/* Attendance section */}
        <Box>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
            Who Attended?
          </Typography>

          <LogSessionParticipantList
            participants={activeBookings}
            attendanceMap={attendanceMap}
            onToggle={(id) => setAttendanceMap((prev) => ({ ...prev, [id]: !prev[id] }))}
            isLoading={isLoading}
            readOnly={readOnly}
          />
        </Box>

        {/* Topics Discussed */}
        <FormField
          label="Topics Discussed"
          htmlFor="log-topics"
          charCount={topicsDiscussed.length}
          charLimit={200}
        >
          <Input
            id="log-topics"
            value={topicsDiscussed}
            onChange={(e) => setTopicsDiscussed(e.target.value.slice(0, 200))}
            inputProps={{ maxLength: 200 }}
            placeholder="e.g. React hooks, async/await patterns, system design..."
            disabled={readOnly}
          />
        </FormField>

        {/* Session Summary */}
        <FormField
          label="Session Summary"
          htmlFor="log-summary"
          hint="Visible context for future reference."
          charCount={summary.length}
          charLimit={800}
        >
          <Textarea
            id="log-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value.slice(0, 800))}
            inputProps={{ maxLength: 800 }}
            rows={3}
            placeholder="Describe what was covered, outcomes achieved, areas of progress..."
            disabled={readOnly}
          />
        </FormField>

        {/* Coach Notes */}
        <FormField
          label="Coach Notes"
          htmlFor="log-coach-notes"
          info="Private — only visible to coaches and admins."
          charCount={coachNotes.length}
          charLimit={500}
        >
          <Textarea
            id="log-coach-notes"
            value={coachNotes}
            onChange={(e) => setCoachNotes(e.target.value.slice(0, 500))}
            inputProps={{ maxLength: 500 }}
            rows={2}
            placeholder="Any private observations, follow-up actions, or concerns..."
            disabled={readOnly}
          />
        </FormField>
      </Stack>
    </Modal>
  )
}
