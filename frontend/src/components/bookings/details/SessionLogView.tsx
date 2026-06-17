import { Box, Stack, Typography, alpha } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Lock, Edit } from 'lucide-react'
import type { SessionLog } from '@/types'
import { Button } from '@/components/shared/ui/Button'
import { toTitleCase } from '@/utils/toTitleCase'

interface SessionLogViewProps {
  log: SessionLog
  canSeePrivateNotes: boolean
  /** True for group-session logs (editing happens in the event schedule view). */
  isGroupSession: boolean
  canLog: boolean
  onEdit: () => void
}

/** Read-only view of a logged session, with an optional "Edit Notes" action. */
export function SessionLogView({
  log,
  canSeePrivateNotes,
  isGroupSession,
  canLog,
  onEdit,
}: SessionLogViewProps) {
  const theme = useTheme()

  return (
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
                sx={{
                  display: 'block',
                  mb: 0.5,
                  textTransform: 'uppercase',
                  fontSize: '0.65rem',
                  letterSpacing: '0.05em',
                }}
              >
                Topics discussed
              </Typography>
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary', lineHeight: 1.5 }}
              >
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
                sx={{
                  display: 'block',
                  mb: 0.5,
                  textTransform: 'uppercase',
                  fontSize: '0.65rem',
                  letterSpacing: '0.05em',
                }}
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
                <Typography
                  variant="caption"
                  color="warning.dark"
                  fontWeight={700}
                  sx={{ textTransform: 'uppercase', fontSize: '0.65rem' }}
                >
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

          {isGroupSession && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              This is a group session log. To edit, open the schedule view of the event.
            </Typography>
          )}
        </Stack>
      </Box>

      {canLog && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onEdit} startIcon={<Edit size={14} />} size="sm">
            Edit Notes
          </Button>
        </Box>
      )}
    </Stack>
  )
}
