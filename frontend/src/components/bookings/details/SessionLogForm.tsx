import { Box, Stack, Typography, Checkbox, FormControlLabel } from '@mui/material'
import { Button } from '@/components/shared/ui/Button'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import { Textarea } from '@/components/shared/form/Textarea'

interface SessionLogFormProps {
  attended: boolean
  setAttended: (value: boolean) => void
  topicsDiscussed: string
  setTopicsDiscussed: (value: string) => void
  summary: string
  setSummary: (value: string) => void
  coachNotes: string
  setCoachNotes: (value: string) => void
  canSeePrivateNotes: boolean
  /** True when an existing log is being edited (controls Cancel button + labels). */
  hasLog: boolean
  isPending: boolean
  onCancel: () => void
  onSave: () => void
}

/** Edit form for a booking's session log (attendance + topics/summary/coach notes). */
export function SessionLogForm({
  attended,
  setAttended,
  topicsDiscussed,
  setTopicsDiscussed,
  summary,
  setSummary,
  coachNotes,
  setCoachNotes,
  canSeePrivateNotes,
  hasLog,
  isPending,
  onCancel,
  onSave,
}: SessionLogFormProps) {
  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, fontSize: '0.85rem' }}>
          Attendance
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={attended}
              onChange={(e) => setAttended(e.target.checked)}
              color="primary"
              size="small"
            />
          }
          label={
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Student attended the session
            </Typography>
          }
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          Unchecking will mark the session as <strong>No Show</strong>.
        </Typography>
      </Box>

      <FormField
        label="Topics discussed"
        htmlFor="booking-topics"
        charCount={topicsDiscussed.length}
        charLimit={200}
      >
        <Input
          id="booking-topics"
          value={topicsDiscussed}
          onChange={(e) => setTopicsDiscussed(e.target.value.slice(0, 200))}
          inputProps={{ maxLength: 200 }}
          placeholder="e.g. Code reviews, database design..."
        />
      </FormField>

      <FormField
        label="Session summary"
        htmlFor="booking-summary"
        hint="Recap covered material. Visible to coaches/admins."
        charCount={summary.length}
        charLimit={800}
      >
        <Textarea
          id="booking-summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value.slice(0, 800))}
          inputProps={{ maxLength: 800 }}
          rows={4}
          placeholder="Topics covered, next steps..."
        />
      </FormField>

      {canSeePrivateNotes && (
        <FormField
          label="Coach notes (private)"
          htmlFor="booking-coach-notes"
          hint="Only visible to coaches and admins."
          charCount={coachNotes.length}
          charLimit={500}
        >
          <Textarea
            id="booking-coach-notes"
            value={coachNotes}
            onChange={(e) => setCoachNotes(e.target.value.slice(0, 500))}
            inputProps={{ maxLength: 500 }}
            rows={3}
            placeholder="Private observations, next steps..."
          />
        </FormField>
      )}

      <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ mt: 1 }}>
        {hasLog && (
          <Button variant="secondary" onClick={onCancel} disabled={isPending} size="sm">
            Cancel
          </Button>
        )}
        <Button onClick={onSave} isLoading={isPending} disabled={isPending} size="sm">
          {hasLog ? 'Update log' : 'Save log'}
        </Button>
      </Stack>
    </Stack>
  )
}
