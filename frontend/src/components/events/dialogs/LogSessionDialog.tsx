import { useState, useEffect } from 'react'
import { useConfirm } from '@/context/confirm'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { format } from 'date-fns'
import { Modal } from '@/components/shared/ui/Modal'
import { Button } from '@/components/shared/ui/Button'
import { Spinner } from '@/components/shared/ui/Spinner'
import { LogSessionParticipantList } from './LogSessionParticipantList'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import { Textarea } from '@/components/shared/form/Textarea'
import { Switch } from '@/components/shared/form/Switch'
import { useSlotBookings, useSlotSessionLog, useUpsertSessionLog } from '@/hooks/queries/useEvents'
import type { EventScheduleSlot, Booking } from '@/types'

interface LogSessionDialogProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  slot: EventScheduleSlot | null
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function LogSessionDialog({ isOpen, onClose, eventId, slot }: LogSessionDialogProps) {
  const slotId = slot?.id ?? ''

  const { data: bookings, isLoading: bookingsLoading } = useSlotBookings(eventId, slotId)
  const { data: existingLog, isLoading: logLoading } = useSlotSessionLog(eventId, slotId)
  const { mutate: upsertLog, isPending } = useUpsertSessionLog(eventId, slotId)

  const [topicsDiscussed, setTopicsDiscussed] = useState('')
  const [summary, setSummary] = useState('')
  const [coachNotes, setCoachNotes] = useState('')
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({})

  const activeBookings = (bookings as Booking[] | undefined)?.filter(
    (b) => b.status !== 'CANCELLED',
  ) ?? []

  useEffect(() => {
    if (!isOpen) return

    if (existingLog) {
      setTopicsDiscussed(existingLog.topicsDiscussed ?? '')
      setSummary(existingLog.summary ?? '')
      setCoachNotes(existingLog.coachNotes ?? '')
      const map: Record<string, boolean> = {}
      existingLog.attendance.forEach((a) => {
        map[a.bookingId] = a.attended
      })
      setAttendanceMap(map)
    } else if (activeBookings.length > 0) {
      // For a new log, default everyone to present
      setTopicsDiscussed('')
      setSummary('')
      setCoachNotes('')
      const map: Record<string, boolean> = {}
      activeBookings.forEach((b) => {
        map[b.id] = true
      })
      setAttendanceMap(map)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, existingLog, activeBookings.length])

  const attendedCount = activeBookings.filter((b) => attendanceMap[b.id] === true).length
  const absentCount = activeBookings.filter((b) => attendanceMap[b.id] === false).length

  const { alert } = useConfirm()

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
      },
      {
        onSuccess: () => {
          onClose()
        },
        onError: (err) => {
          alert({
            title: 'Save Failed',
            message: 'Failed to save session log. Please try again.',
          })
        }
      },
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

  const footer = (
    <Stack direction="row" justifyContent="space-between" alignItems="center" width="100%">
      <Typography variant="caption" color="text.secondary">
        {attendedCount} attended · {absentCount} absent
      </Typography>
      <Stack direction="row" spacing={1}>
        <Button variant="secondary" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleSave} isLoading={isPending} disabled={isPending || isLoading}>
          {existingLog ? 'Update Log' : 'Save Log'}
        </Button>
      </Stack>
    </Stack>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Session"
      size="md"
      footer={footer}
    >
      <Stack spacing={3} sx={{ mt: 1 }}>
        {/* Session header banner */}
        <Box
          sx={{
            p: 2,
            bgcolor: '#FFF6F0',
            border: '1px solid #DEE3ED',
            borderRadius: 2,
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

        {/* Attendance section */}
        <Box>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
            Who Attended?
          </Typography>

          <LogSessionParticipantList
            participants={activeBookings}
            attendanceMap={attendanceMap}
            onToggle={(id) => setAttendanceMap(prev => ({ ...prev, [id]: !prev[id] }))}
            isLoading={isLoading}
          />
        </Box>

        {/* Topics Discussed */}
        <FormField label="Topics Discussed" htmlFor="log-topics">
          <Input
            id="log-topics"
            value={topicsDiscussed}
            onChange={(e) => setTopicsDiscussed(e.target.value)}
            placeholder="e.g. React hooks, async/await patterns, system design..."
          />
        </FormField>

        {/* Session Summary */}
        <FormField
          label="Session Summary"
          htmlFor="log-summary"
          hint="Visible context for future reference."
        >
          <Textarea
            id="log-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            placeholder="Describe what was covered, outcomes achieved, areas of progress..."
          />
        </FormField>

        {/* Coach Notes */}
        <FormField
          label="Coach Notes"
          htmlFor="log-coach-notes"
          info="Private — only visible to coaches and admins."
        >
          <Textarea
            id="log-coach-notes"
            value={coachNotes}
            onChange={(e) => setCoachNotes(e.target.value)}
            rows={2}
            placeholder="Any private observations, follow-up actions, or concerns..."
          />
        </FormField>
      </Stack>
    </Modal>
  )
}
