import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { AlertCircle, Clock } from 'lucide-react'
import type { UserWithDetails } from '@/types'
import { DAYS, formatDate } from './userDetailUtils'

interface UserAvailabilityTabProps {
  user: UserWithDetails
}

export function UserAvailabilityTab({ user }: UserAvailabilityTabProps) {
  return (
    <Grid container spacing={4}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Typography
          variant="subtitle1"
          fontWeight={700}
          gutterBottom
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Clock size={18} /> Weekly Schedule
        </Typography>
        <Paper variant="outlined">
          <List disablePadding>
            {DAYS.map((day, idx) => {
              const slots = user.weeklyAvailability.filter((availability) => availability.dayOfWeek === idx)

              return (
                <ListItem key={day} divider={idx < 6}>
                  <ListItemText primary={day} sx={{ flex: '0 0 120px' }} />
                  <Box>
                    {slots.length > 0 ? (
                      slots.map((slot, slotIndex) => (
                        <Chip
                          key={slotIndex}
                          label={`${slot.startTime} - ${slot.endTime}`}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 0.5 }}
                        />
                      ))
                    ) : (
                      <Typography variant="caption" color="text.secondary italic">
                        Unavailable
                      </Typography>
                    )}
                  </Box>
                </ListItem>
              )
            })}
          </List>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Typography
          variant="subtitle1"
          fontWeight={700}
          gutterBottom
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <AlertCircle size={18} /> Exceptions
        </Typography>
        {user.availabilityExceptions.length > 0 ? (
          <List disablePadding>
            {user.availabilityExceptions.map((exception) => (
              <Paper
                key={exception.id}
                variant="outlined"
                sx={{
                  p: 1.5,
                  mb: 1,
                  borderLeft: 4,
                  borderColor: 'divider',
                  borderLeftColor: exception.isUnavailable ? '#94a3b8' : 'primary.main',
                  bgcolor: 'background.paper',
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" fontWeight={600} color="text.primary">
                      {formatDate(exception.date)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {exception.isUnavailable ? 'Unavailable' : `${exception.startTime} - ${exception.endTime}`}
                    </Typography>
                  </Box>
                  <Chip
                    label={exception.isUnavailable ? 'Off' : 'Override'}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.625rem',
                      textTransform: 'uppercase',
                      color: exception.isUnavailable ? 'text.secondary' : 'primary.main',
                      borderColor: 'divider',
                    }}
                  />
                </Stack>
              </Paper>
            ))}
          </List>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              No upcoming exceptions.
            </Typography>
          </Box>
        )}
      </Grid>
    </Grid>
  )
}
