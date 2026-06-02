import { useState, useEffect } from 'react'
import { Box, Stack, Typography, alpha, Tabs, Tab, Checkbox, FormControlLabel } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Lock, Edit, ClipboardCheck } from 'lucide-react'
import type { Booking } from '@/types'
import { Button } from '@/components/shared/ui/Button'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import { Textarea } from '@/components/shared/form/Textarea'
import { Spinner } from '@/components/shared/ui/Spinner'
import { useConfirm } from '@/context/confirm'
import { useBookingSessionLog, useUpsertBookingSessionLog } from '@/hooks/queries/useBookingLog'
import { usePermissions } from '@/hooks/usePermissions'
import { extractApiError } from '@/utils/apiError'
import { toTitleCase } from '@/utils/toTitleCase'

const contextItems = [
  { label: 'Specific Question', field: 'specificQuestion' },
  { label: 'Attempted Solutions', field: 'triedSolutions' },
  { label: 'Resources Used', field: 'usedResources' },
  { label: 'Session Objectives', field: 'sessionObjectives' },
] as const satisfies Array<{ label: string; field: keyof Booking }>

interface BookingDetailsRightSectionProps {
  booking: Booking
}

export function BookingDetailsRightSection({ booking }: BookingDetailsRightSectionProps) {
  const theme = useTheme()
  const { isCoach, isAdmin } = usePermissions()
  const canSeePrivateNotes = isCoach || isAdmin

  const [activeTab, setActiveTab] = useState(0)
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

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        p: 2.5,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: `0 1px 3px ${alpha(theme.palette.common.black, 0.02)}`,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.04)}`,
          borderColor: alpha(theme.palette.primary.main, 0.16),
        },
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2.5 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          aria-label="booking detail tabs"
          variant="fullWidth"
          sx={{
            minHeight: '36px',
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
            '& .MuiTab-root': {
              minHeight: '36px',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
              color: 'text.secondary',
              pb: 1,
              pt: 0,
              '&.Mui-selected': {
                color: 'primary.main',
              },
            },
          }}
        >
          <Tab label="Problem Context" />
          <Tab label={log ? "Session Notes" : "Log Session"} />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Box sx={{ position: 'relative', overflow: 'hidden' }}>
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              bottom: 8,
              left: 4,
              width: '2px',
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              borderRadius: 1,
            }}
          />

          <Stack spacing={3}>
            {contextItems.map((item, index) => (
              <Box key={index} sx={{ position: 'relative', pl: 3.5 }}>
                <Box
                  sx={{
                    position: 'absolute',
                    left: 0,
                    top: 6,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    border: `2px solid ${theme.palette.background.paper}`,
                    boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`,
                    zIndex: 1,
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: theme.palette.primary.main,
                    display: 'block',
                    textTransform: 'uppercase',
                    fontSize: '0.65rem',
                    mb: 0.5,
                  }}
                >
                  {item.label}
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                  {booking[item.field] || 'None provided'}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          {isLoading ? (
            <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
              <Spinner />
            </Box>
          ) : isEditing ? (
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
                  placeholder="e.g. Code reviews, database design..."
                />
              </FormField>

              <FormField
                label="Session summary"
                htmlFor="booking-summary"
                hint="Recap covered material. Visible to coaches/admins."
              >
                <Textarea
                  id="booking-summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={4}
                  placeholder="Topics covered, next steps..."
                />
              </FormField>

              {canSeePrivateNotes && (
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
                    placeholder="Private observations, next steps..."
                  />
                </FormField>
              )}

              <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ mt: 1 }}>
                {log && (
                  <Button variant="secondary" onClick={() => setIsEditing(false)} disabled={isPending} size="sm">
                    Cancel
                  </Button>
                )}
                <Button onClick={handleSave} isLoading={isPending} disabled={isPending} size="sm">
                  {log ? 'Update log' : 'Save log'}
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Box>
              {log ? (
                <Stack spacing={2.5}>
                  <Box
                    sx={{
                      p: 2,
                      border: '1px solid',
                      borderColor: alpha(theme.palette.primary.main, 0.1),
                      borderRadius: 1,
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Logged by{' '}
                        <strong>
                          {log.loggedBy
                            ? `${toTitleCase(log.loggedBy.firstName)} ${toTitleCase(log.loggedBy.lastName)}`.trim()
                            : 'Unknown'}
                        </strong>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Intl.DateTimeFormat('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(log.updatedAt))}
                      </Typography>
                    </Stack>

                    <Stack spacing={2.5}>
                      {log.topicsDiscussed && (
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.primary"
                            fontWeight={800}
                            sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}
                          >
                            Topics discussed
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {log.topicsDiscussed}
                          </Typography>
                        </Box>
                      )}

                      {log.summary && (
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.primary"
                            fontWeight={800}
                            sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}
                          >
                            Session summary
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary', lineHeight: 1.5 }}
                          >
                            {log.summary}
                          </Typography>
                        </Box>
                      )}

                      {log.coachNotes && canSeePrivateNotes && (
                        <Box
                          sx={{
                            p: 1.5,
                            bgcolor: '#FFFBE9',
                            border: '1px solid',
                            borderColor: alpha(theme.palette.warning.main, 0.3),
                            borderRadius: 1,
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                            <Lock size={13} color="#b78103" />
                            <Typography variant="caption" color="warning.dark" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
                              Coach notes (private)
                            </Typography>
                          </Stack>
                          <Typography
                            variant="body2"
                            sx={{ whiteSpace: 'pre-wrap', color: 'warning.dark', lineHeight: 1.5 }}
                          >
                            {log.coachNotes}
                          </Typography>
                        </Box>
                      )}

                      {booking.scheduleSlotId && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          This is a group session log. To edit, open the schedule view of the event.
                        </Typography>
                      )}
                    </Stack>
                  </Box>

                  {canLog && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="secondary"
                        onClick={() => setIsEditing(true)}
                        startIcon={<Edit size={14} />}
                        size="sm"
                      >
                        Edit Notes
                      </Button>
                    </Box>
                  )}
                </Stack>
              ) : (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    No session notes have been logged for this booking yet.
                  </Typography>
                  {canLog && (
                    <Button variant="primary" onClick={() => setIsEditing(true)} size="sm">
                      Log session notes
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}

