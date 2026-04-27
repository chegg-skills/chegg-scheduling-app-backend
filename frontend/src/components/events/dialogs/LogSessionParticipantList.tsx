import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import Switch from '@mui/material/Switch'
import Paper from '@mui/material/Paper'
import { Spinner } from '@/components/shared/ui/Spinner'
import { Badge } from '@/components/shared/ui/Badge'

interface Participant {
  id: string
  studentName: string | null
  studentEmail: string | null
}

interface LogSessionParticipantListProps {
  participants: Participant[]
  attendanceMap: Record<string, boolean>
  onToggle: (id: string) => void
  isLoading?: boolean
}

/**
 * Renders a list of participants for session logging.
 * Encapsulates attendance toggling and student identification.
 */
export function LogSessionParticipantList({
  participants,
  attendanceMap,
  onToggle,
  isLoading,
}: LogSessionParticipantListProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  if (isLoading) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Spinner />
      </Box>
    )
  }

  if (participants.length === 0) {
    return (
      <Box
        sx={{
          py: 4,
          textAlign: 'center',
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No confirmed bookings for this slot.
        </Typography>
      </Box>
    )
  }

  return (
    <Stack spacing={1}>
      {participants.map((participant) => {
        const attended = attendanceMap[participant.id] ?? false
        const displayName = participant.studentName || 'Anonymous Student'
        const displayEmail = participant.studentEmail || ''

        return (
          <Paper key={participant.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar sx={{ width: 36, height: 36, fontSize: '0.8rem', bgcolor: 'secondary.main' }}>
                  {getInitials(displayName)}
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {displayName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {displayEmail}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Badge
                  label={attended ? 'Attended' : 'Absent'}
                  color={attended ? 'success' : 'error'}
                />
                <Switch
                  checked={attended}
                  onChange={() => onToggle(participant.id)}
                  color="success"
                  size="small"
                />
              </Stack>
            </Stack>
          </Paper>
        )
      })}
    </Stack>
  )
}
