import { useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Stack,
  Avatar,
  Chip,
  IconButton,
  Button,
  Collapse,
  Tooltip,
  CircularProgress,
} from '@mui/material'
import { CheckCircle2, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Mail } from 'lucide-react'
import { format } from 'date-fns'
import { toTitleCase } from '@/utils/toTitleCase'
import { useStudentCommunications, useRetryStudentEmail } from '@/hooks/queries/useStudents'
import { alpha, keyframes } from '@mui/material/styles'
import DOMPurify from 'dompurify'

// Pulsing animation for PENDING sending state
const pulse = keyframes`
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(2, 136, 209, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 6px rgba(2, 136, 209, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(2, 136, 209, 0);
  }
`

interface StudentCommunicationsTabProps {
  studentId: string
}

export function StudentCommunicationsTab({ studentId }: StudentCommunicationsTabProps) {
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({})
  // Track which specific log is currently being retried for per-row loading state
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null)
  const [retryErrorId, setRetryErrorId] = useState<string | null>(null)
  const { mutateAsync: retryEmail } = useRetryStudentEmail()

  // 1. Fetch communication logs
  // Smart Polling: Poll every 5s if any log is PENDING, otherwise polling is disabled.
  const { data: logs = [], isLoading } = useStudentCommunications(studentId, {
    refetchInterval: (query) => {
      const currentLogs = query.state.data ?? []
      const hasPending = currentLogs.some((l: any) => l.status === 'PENDING')
      return hasPending ? 5000 : false
    },
  })

  const toggleExpand = (logId: string) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [logId]: !prev[logId],
    }))
  }

  const handleRetry = async (logId: string) => {
    setRetryingLogId(logId)
    setRetryErrorId(null)
    try {
      await retryEmail(logId)
    } catch (err) {
      console.error('Failed to retry email dispatch:', err)
      setRetryErrorId(logId)
    } finally {
      setRetryingLogId(null)
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={36} />
      </Box>
    )
  }

  if (logs.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 6,
          textAlign: 'center',
          borderRadius: 3,
          borderStyle: 'dashed',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Mail size={40} style={{ opacity: 0.4, marginBottom: 12 }} />
        <Typography variant="subtitle1" fontWeight={700} color="text.secondary">
          No Communication Logs Found
        </Typography>
        <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
          Email dispatches composed via the Student Table will appear here.
        </Typography>
      </Paper>
    )
  }

  return (
    <Stack spacing={3} sx={{ position: 'relative' }}>
      {/* Decorative vertical line in the timeline background */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          bottom: 16,
          left: { xs: 24, sm: 28 },
          width: '2px',
          bgcolor: 'divider',
          zIndex: 0,
        }}
      />

      {logs.map((log) => {
        const isExpanded = !!expandedLogs[log.id]
        const formattedDate = format(new Date(log.sentAt), 'MMM d, yyyy, h:mm a')

        return (
          <Stack
            key={log.id}
            direction="row"
            spacing={{ xs: 2, sm: 3 }}
            alignItems="flex-start"
            sx={{ zIndex: 1, position: 'relative' }}
          >
            {/* Coach Sender Avatar representing Timeline node */}
            <Avatar
              src={log.sentBy.avatarUrl ?? undefined}
              sx={{
                width: { xs: 48, sm: 56 },
                height: { xs: 48, sm: 56 },
                border: '3px solid',
                borderColor: 'background.paper',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                bgcolor: (theme: any) => theme.palette.accent?.peach || '#FFF6F0',
                color: 'primary.dark',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              {log.sentBy.firstName[0]}
              {log.sentBy.lastName[0]}
            </Avatar>

            {/* Timeline Message Card */}
            <Paper
              variant="outlined"
              sx={{
                flex: 1,
                borderRadius: 1.5, // 12px to match theme design system
                overflow: 'hidden',
                bgcolor: (theme: any) => theme.palette.accent?.peach || '#FFF6F0',
                borderColor: (theme: any) => alpha(theme.palette.primary.main, 0.15),
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: (theme: any) =>
                    `0 4px 12px ${alpha(theme.palette.primary.main, 0.08)}`,
                  borderColor: (theme: any) => alpha(theme.palette.primary.main, 0.25),
                },
              }}
            >
              <Box sx={{ p: 2.5 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={2}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" color="text.secondary">
                      Sent by{' '}
                      <span style={{ fontWeight: 600, color: 'var(--mui-palette-text-primary)' }}>
                        {toTitleCase(log.sentBy.firstName)} {toTitleCase(log.sentBy.lastName)}
                      </span>
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {formattedDate}
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1 }}>
                      {log.subject}
                    </Typography>
                  </Box>

                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexShrink: 0 }}>
                    {/* Dynamic Badges */}
                    {log.status === 'PENDING' && (
                      <Chip
                        icon={
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              bgcolor: 'info.main',
                              animation: `${pulse} 2s infinite`,
                              mr: 1,
                            }}
                          />
                        }
                        label="Sending..."
                        size="small"
                        sx={{
                          bgcolor: (theme) => alpha(theme.palette.info.main, 0.12),
                          color: (theme) => theme.palette.info.dark,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      />
                    )}
                    {log.status === 'SENT' && (
                      <Chip
                        icon={<CheckCircle2 size={12} />}
                        label="Sent"
                        size="small"
                        sx={{
                          bgcolor: (theme) => alpha(theme.palette.success.main, 0.12),
                          color: (theme) => theme.palette.success.dark,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          '& .MuiChip-icon': { color: 'success.dark' },
                        }}
                      />
                    )}
                    {log.status === 'FAILED' && (
                      <Tooltip title={log.errorMessage || 'Unknown SMTP error'} arrow>
                        <Chip
                          icon={<AlertTriangle size={12} />}
                          label="Failed"
                          size="small"
                          sx={{
                            bgcolor: (theme) => alpha(theme.palette.error.main, 0.12),
                            color: (theme) => theme.palette.error.dark,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'help',
                            '& .MuiChip-icon': { color: 'error.dark' },
                          }}
                        />
                      </Tooltip>
                    )}

                    {/* Resend Action Button */}
                    {log.status === 'FAILED' && (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => handleRetry(log.id)}
                          disabled={retryingLogId === log.id}
                          startIcon={
                            retryingLogId === log.id ? (
                              <CircularProgress size={12} color="inherit" />
                            ) : (
                              <RefreshCw size={12} />
                            )
                          }
                          sx={{
                            py: 0.25,
                            px: 1.5,
                            borderRadius: 1.5,
                            textTransform: 'none',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          Resend
                        </Button>
                        {retryErrorId === log.id && (
                          <Typography
                            variant="caption"
                            color="error"
                            sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}
                          >
                            Retry failed
                          </Typography>
                        )}
                      </>
                    )}

                    <IconButton size="small" onClick={() => toggleExpand(log.id)}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>

              <Collapse in={isExpanded}>
                <Box
                  sx={{
                    px: 2.5,
                    pb: 2.5,
                    pt: 0,
                    borderTop: 1,
                    borderColor: 'divider',
                    bgcolor: (theme: any) =>
                      alpha(theme.palette.accent?.lavender || '#E2DFFF', 0.4),
                  }}
                >
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      bgcolor: 'background.paper',
                      borderRadius: 1.5,
                      border: 1,
                      borderColor: 'divider',
                      fontFamily: 'inherit',
                      fontSize: '0.875rem',
                      lineHeight: 1.6,
                      color: 'text.primary',
                      whiteSpace: 'pre-wrap',
                    }}
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(log.body),
                    }}
                  />
                </Box>
              </Collapse>
            </Paper>
          </Stack>
        )
      })}
    </Stack>
  )
}
