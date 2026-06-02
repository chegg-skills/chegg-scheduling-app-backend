import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import { alpha, useTheme } from '@mui/material/styles'
import { FileText, Calendar, User, ClipboardCheck, Lock } from 'lucide-react'
import { format } from 'date-fns'
import { useStudentSessionLogs } from '@/hooks/queries/useStudents'
import { Spinner } from '@/components/shared/ui/Spinner'

interface StudentSessionLogTimelineProps {
  studentId: string
}

export function StudentSessionLogTimeline({ studentId }: StudentSessionLogTimelineProps) {
  const theme = useTheme()
  const { data: entries, isLoading } = useStudentSessionLogs(studentId)

  if (isLoading) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
        <CardContent sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
          <Spinner />
        </CardContent>
      </Card>
    )
  }

  const items = entries ?? []

  if (items.length === 0) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 1.5, borderColor: 'divider' }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Stack spacing={2} alignItems="center" justifyContent="center">
            <Box
              sx={{
                p: 2,
                borderRadius: '50%',
                bgcolor: 'action.hover',
                color: 'text.secondary',
                display: 'flex',
              }}
            >
              <FileText size={32} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                No session notes yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Notes appear here after a coach logs a completed session.
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 1.5, borderColor: 'divider' }}>
      <CardContent sx={{ p: 4 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 4 }}>
          <ClipboardCheck size={22} color={theme.palette.primary.main} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Session notes timeline
          </Typography>
          <Chip
            label={`${items.length} logged`}
            size="small"
            color="primary"
            variant="filled"
            sx={{
              fontWeight: 600,
              fontSize: '0.75rem',
              borderRadius: '6px',
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              color: 'primary.dark',
            }}
          />
        </Stack>

        <Stack spacing={4} sx={{ position: 'relative', pl: 4 }}>
          <Box
            sx={{
              position: 'absolute',
              left: 15,
              top: 14,
              bottom: 14,
              width: '2px',
              bgcolor: 'divider',
              zIndex: 1,
            }}
          />

          {items.map((entry, idx) => {
            const initials = entry.loggedBy
              ? `${entry.loggedBy.firstName.charAt(0)}${entry.loggedBy.lastName.charAt(0)}`.toUpperCase()
              : '??'
            const loggedByName = entry.loggedBy
              ? `${entry.loggedBy.firstName} ${entry.loggedBy.lastName}`.trim()
              : 'Unknown'

            return (
              <Box key={entry.logId} sx={{ position: 'relative', zIndex: 2 }}>
                <Box
                  sx={{
                    position: 'absolute',
                    left: -28,
                    top: 2,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 0 0 4px ${theme.palette.background.paper}`,
                  }}
                >
                  <FileText size={12} />
                </Box>

                <Stack spacing={2}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    spacing={1}
                  >
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {entry.eventName}
                      </Typography>
                      <Chip
                        label={entry.isGroupSession ? 'Group session' : '1:1 session'}
                        size="small"
                        sx={{
                          fontSize: '0.675rem',
                          fontWeight: 600,
                          height: 20,
                          borderRadius: '4px',
                          bgcolor: entry.isGroupSession
                            ? alpha(theme.palette.secondary.main, 0.08)
                            : alpha(theme.palette.success.main, 0.08),
                          color: entry.isGroupSession ? 'secondary.dark' : 'success.dark',
                        }}
                      />
                      {entry.attended != null && (
                        <Chip
                          label={entry.attended ? 'Attended' : 'No show'}
                          size="small"
                          sx={{
                            fontSize: '0.675rem',
                            fontWeight: 600,
                            height: 20,
                            borderRadius: '4px',
                            bgcolor: entry.attended
                              ? alpha(theme.palette.success.main, 0.12)
                              : alpha(theme.palette.error.main, 0.12),
                            color: entry.attended ? 'success.dark' : 'error.dark',
                          }}
                        />
                      )}
                    </Stack>

                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ color: 'text.secondary' }}
                    >
                      <Calendar size={14} />
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {format(new Date(entry.sessionDate), 'MMMM d, yyyy · h:mm a')}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Box
                    sx={{
                      p: 2.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      bgcolor: 'background.default',
                    }}
                  >
                    <Stack spacing={2}>
                      {entry.topicsDiscussed && (
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight={600}
                            sx={{ display: 'block', mb: 0.5 }}
                          >
                            TOPICS DISCUSSED
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {entry.topicsDiscussed}
                          </Typography>
                        </Box>
                      )}

                      {entry.summary && (
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight={600}
                            sx={{ display: 'block', mb: 0.5 }}
                          >
                            SESSION SUMMARY
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}
                          >
                            {entry.summary}
                          </Typography>
                        </Box>
                      )}

                      {entry.coachNotes && (
                        <Box
                          sx={{
                            p: 1.5,
                            bgcolor: 'warning.light',
                            border: '1px solid',
                            borderColor: 'warning.light',
                            borderRadius: 1.5,
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                            <Lock size={13} />
                            <Typography variant="caption" color="warning.dark" fontWeight={700}>
                              COACH NOTES (PRIVATE)
                            </Typography>
                          </Stack>
                          <Typography
                            variant="body2"
                            sx={{ whiteSpace: 'pre-wrap', color: 'warning.dark' }}
                          >
                            {entry.coachNotes}
                          </Typography>
                        </Box>
                      )}

                      <Divider sx={{ my: 1, borderColor: alpha(theme.palette.divider, 0.6) }} />

                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar
                            sx={{
                              width: 24,
                              height: 24,
                              fontSize: '0.65rem',
                              bgcolor: 'primary.main',
                            }}
                          >
                            {initials}
                          </Avatar>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontWeight: 600 }}
                          >
                            Logged by {loggedByName}
                          </Typography>
                        </Stack>

                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={0.5}
                          sx={{ color: 'text.secondary' }}
                        >
                          <User size={12} />
                          <Typography variant="caption">Coach: {entry.coachName}</Typography>
                        </Stack>
                      </Stack>
                    </Stack>
                  </Box>
                </Stack>

                {idx < items.length - 1 && <Divider sx={{ my: 3, borderStyle: 'dashed' }} />}
              </Box>
            )
          })}
        </Stack>
      </CardContent>
    </Card>
  )
}
