import { Box, Typography, alpha } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import type { Booking } from '@/types'
import { Button } from '@/components/shared/ui/Button'
import { Spinner } from '@/components/shared/ui/Spinner'
import { SessionLogForm } from './SessionLogForm'
import { SessionLogView } from './SessionLogView'
import type { SessionLogDraft } from './useSessionLogDraft'

interface SessionNotesTabProps {
  booking: Booking
  draft: SessionLogDraft
}

/**
 * "Session Notes" tab — dispatches between loading, the edit form, the read-only
 * logged view, and the empty state based on the draft's fetch/edit state.
 */
export function SessionNotesTab({ booking, draft }: SessionNotesTabProps) {
  const theme = useTheme()
  const {
    log,
    canLog,
    isLoading,
    isEditing,
    setIsEditing,
    isPending,
    canSeePrivateNotes,
    topicsDiscussed,
    setTopicsDiscussed,
    summary,
    setSummary,
    coachNotes,
    setCoachNotes,
    attended,
    setAttended,
    handleSave,
  } = draft

  return (
    <Box
      sx={{
        flexGrow: 1,
        minHeight: 0,
        maxHeight: { xs: '380px', md: 'none' },
        overflowY: 'auto',
        pr: 1.5,
        mr: -1.5,
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: alpha(theme.palette.text.secondary, 0.2),
          borderRadius: '3px',
          '&:hover': {
            background: alpha(theme.palette.text.secondary, 0.4),
          },
        },
      }}
    >
      {isLoading ? (
        <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
          <Spinner />
        </Box>
      ) : isEditing ? (
        <SessionLogForm
          attended={attended}
          setAttended={setAttended}
          topicsDiscussed={topicsDiscussed}
          setTopicsDiscussed={setTopicsDiscussed}
          summary={summary}
          setSummary={setSummary}
          coachNotes={coachNotes}
          setCoachNotes={setCoachNotes}
          canSeePrivateNotes={canSeePrivateNotes}
          hasLog={Boolean(log)}
          isPending={isPending}
          onCancel={() => setIsEditing(false)}
          onSave={handleSave}
        />
      ) : (
        <Box>
          {log ? (
            <SessionLogView
              log={log}
              canSeePrivateNotes={canSeePrivateNotes}
              isGroupSession={Boolean(booking.scheduleSlotId)}
              canLog={canLog}
              onEdit={() => setIsEditing(true)}
            />
          ) : (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {booking.scheduleSlotId
                  ? 'No session notes yet. Notes for group sessions are logged from the schedule view.'
                  : 'No session notes have been logged for this booking yet.'}
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
  )
}
