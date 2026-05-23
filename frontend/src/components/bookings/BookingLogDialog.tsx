import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import { format } from 'date-fns'
import { Modal } from '@/components/shared/ui/Modal'
import { Button } from '@/components/shared/ui/Button'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import { Textarea } from '@/components/shared/form/Textarea'
import { Spinner } from '@/components/shared/ui/Spinner'
import { useConfirm } from '@/context/confirm'
import {
  useBookingSessionLog,
  useUpsertBookingSessionLog,
} from '@/hooks/queries/useBookingLog'
import { extractApiError } from '@/utils/apiError'
import type { Booking } from '@/types'

interface BookingLogDialogProps {
  isOpen: boolean
  onClose: () => void
  booking: Booking
}

export function BookingLogDialog({ isOpen, onClose, booking }: BookingLogDialogProps) {
  const { data: existingLog, isLoading } = useBookingSessionLog(booking.id, { enabled: isOpen })
  const { mutate: upsertLog, isPending } = useUpsertBookingSessionLog(booking.id)
  const { alert } = useConfirm()

  const [topicsDiscussed, setTopicsDiscussed] = useState('')
  const [summary, setSummary] = useState('')
  const [coachNotes, setCoachNotes] = useState('')
  const [attended, setAttended] = useState(true)

  useEffect(() => {
    if (!isOpen) return

    if (existingLog) {
      setTopicsDiscussed(existingLog.topicsDiscussed ?? '')
      setSummary(existingLog.summary ?? '')
      setCoachNotes(existingLog.coachNotes ?? '')
      const wasPresent = existingLog.attendance?.[0]?.attended ?? true
      setAttended(wasPresent)
    } else {
      setTopicsDiscussed('')
      setSummary('')
      setCoachNotes('')
      setAttended(booking.status !== 'NO_SHOW')
    }
  }, [isOpen, existingLog, booking.status])

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
          onClose()
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

  const dateStr = format(new Date(booking.startTime), 'EEE, MMM d, yyyy')
  const timeStr = `${format(new Date(booking.startTime), 'h:mm a')} – ${format(
    new Date(booking.endTime),
    'h:mm a'
  )}`

  const footer = (
    <Stack direction="row" justifyContent="flex-end" spacing={1.5} width="100%">
      <Button variant="secondary" onClick={onClose} disabled={isPending}>
        Cancel
      </Button>
      <Button onClick={handleSave} isLoading={isPending} disabled={isPending || isLoading}>
        {existingLog ? 'Update log' : 'Save log'}
      </Button>
    </Stack>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log session notes" size="md" footer={footer}>
      <Stack spacing={3} sx={{ mt: 1 }}>
        <Box
          sx={{
            p: 2,
            bgcolor: '#FFF6F0',
            border: '1px solid #DEE3ED',
            borderRadius: 2,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            STUDENT · DATE & TIME
          </Typography>
          <Typography variant="subtitle2" fontWeight={700}>
            {booking.studentName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {dateStr} · {timeStr}
          </Typography>
        </Box>

        {isLoading ? (
          <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
            <Spinner />
          </Box>
        ) : (
          <>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Attendance
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={attended}
                    onChange={(e) => setAttended(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Student attended the session
                  </Typography>
                }
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 0.5 }}
              >
                Unchecking will mark the session as <strong>No Show</strong>.
              </Typography>
            </Box>

            <FormField label="Topics discussed" htmlFor="booking-topics">
              <Input
                id="booking-topics"
                value={topicsDiscussed}
                onChange={(e) => setTopicsDiscussed(e.target.value)}
                placeholder="e.g. Code reviews, database design, testing strategies..."
              />
            </FormField>

            <FormField
              label="Session summary"
              htmlFor="booking-summary"
              hint="A recap of what was covered. Visible to admins and coaches."
            >
              <Textarea
                id="booking-summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={4}
                placeholder="Topics covered, next steps, learning outcomes..."
              />
            </FormField>

            <FormField
              label="Coach notes (private)"
              htmlFor="booking-coach-notes"
              hint="Only visible to coaches and admins."
            >
              <Textarea
                id="booking-coach-notes"
                value={coachNotes}
                onChange={(e) => setCoachNotes(e.target.value)}
                rows={3}
                placeholder="Private observations, engagement notes for the next coach..."
              />
            </FormField>
          </>
        )}
      </Stack>
    </Modal>
  )
}
