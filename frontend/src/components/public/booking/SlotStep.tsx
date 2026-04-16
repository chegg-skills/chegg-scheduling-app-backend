import * as React from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import { alpha } from '@mui/material/styles'
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import type { AvailableSlot } from '@/api/public'

interface SlotStepProps {
  slots: AvailableSlot[]
  loading: boolean
  selectedDate: Date
  onDateSelect: (date: Date) => void
  selectedSlot: string | null
  onSelect: (slot: string) => void
}

export function SlotStep({
  slots,
  loading,
  selectedDate,
  onDateSelect,
  selectedSlot,
  onSelect,
}: SlotStepProps) {
  const { amSlots, pmSlots } = React.useMemo(() => {
    const am: AvailableSlot[] = []
    const pm: AvailableSlot[] = []

    // Ensure slots are sorted chronologically
    const sorted = [...slots].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )

    sorted.forEach((s) => {
      const date = new Date(s.startTime)
      if (date.getHours() < 12) {
        am.push(s)
      } else {
        pm.push(s)
      }
    })

    return { amSlots: am, pmSlots: pm }
  }, [slots])

  return (
    <Box sx={{ overflow: 'hidden', height: { lg: '100%' } }}>
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        alignItems="stretch"
        divider={
          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', lg: 'block' } }} />
        }
        sx={{ height: '100%' }}
      >
        {/* Column 1: Calendar Picker */}
        <Box sx={{ width: { xs: '100%', lg: 400 }, flexShrink: 0, p: 3 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            fontWeight={800}
            sx={{ display: 'block', mb: 2, letterSpacing: 1.2, fontSize: '0.7rem' }}
          >
            Select date
          </Typography>
          <Paper
            variant="outlined"
            sx={{ overflow: 'hidden', borderRadius: 1, bgcolor: 'background.paper' }}
          >
            <StaticDatePicker
              displayStaticWrapperAs="desktop"
              value={selectedDate}
              onChange={(newValue) => newValue && onDateSelect(newValue)}
              minDate={new Date()}
              slotProps={{
                actionBar: { actions: [] },
              }}
              sx={{
                '.MuiDateCalendar-root': {
                  width: '100%',
                  maxWidth: 'none',
                },
              }}
            />
          </Paper>
        </Box>

        {/* Column 2: Slot Selection */}
        <Box
          sx={{
            flexGrow: 1,
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="overline"
              color="text.secondary"
              fontWeight={800}
              sx={{ display: 'block', mb: 1, letterSpacing: 1.2, fontSize: '0.7rem' }}
            >
              Available slots
            </Typography>
            <Typography variant="h6" fontWeight={800} color="text.primary">
              {new Intl.DateTimeFormat('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              }).format(selectedDate)}
            </Typography>
          </Box>
          <Divider sx={{ mb: 1 }} />

          {/* Scrollable grid area for slots */}
          <Box
            sx={{
              overflowY: 'auto',
              flexGrow: 1,
              pr: 1,
              mt: 1,
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.200', borderRadius: 2 },
            }}
          >
            {loading ? (
              <PageSpinner />
            ) : slots.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography color="text.secondary" variant="body2">
                  No availability on this date.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ pb: 2 }}>
                {amSlots.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mb: 1.5, display: 'block', fontWeight: 700 }}
                    >
                      Morning
                    </Typography>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                        gap: 0.5,
                      }}
                    >
                      {amSlots.map((s) => (
                        <Button
                          key={s.startTime}
                          variant={selectedSlot === s.startTime ? 'contained' : 'outlined'}
                          fullWidth
                          onClick={() => onSelect(s.startTime)}
                          sx={{
                            py: 1,
                            px: 0,
                            borderRadius: 1,
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            textTransform: 'none',
                            ...(selectedSlot === s.startTime
                              ? {
                                  bgcolor: 'primary.main',
                                  color: 'white',
                                  '&:hover': { bgcolor: 'primary.dark' },
                                }
                              : {
                                  borderColor: (theme) => alpha(theme.palette.divider, 0.5),
                                  color: 'text.primary',
                                  '&:hover': {
                                    borderColor: 'primary.main',
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                                  },
                                }),
                          }}
                        >
                          <Typography variant="caption" fontWeight={800}>
                            {new Intl.DateTimeFormat('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            }).format(new Date(s.startTime))}
                          </Typography>
                        </Button>
                      ))}
                    </Box>
                  </Box>
                )}

                {pmSlots.length > 0 && (
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mb: 1.5, display: 'block', fontWeight: 700 }}
                    >
                      Afternoon & Evening
                    </Typography>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                        gap: 0.5,
                      }}
                    >
                      {pmSlots.map((s) => (
                        <Button
                          key={s.startTime}
                          variant={selectedSlot === s.startTime ? 'contained' : 'outlined'}
                          fullWidth
                          onClick={() => onSelect(s.startTime)}
                          sx={{
                            py: 1,
                            px: 0,
                            borderRadius: 0.5,
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            textTransform: 'none',
                            ...(selectedSlot === s.startTime
                              ? {
                                  bgcolor: 'primary.main',
                                  color: 'white',
                                  '&:hover': { bgcolor: 'primary.dark' },
                                }
                              : {
                                  borderColor: (theme) => alpha(theme.palette.divider, 0.5),
                                  color: 'text.primary',
                                  '&:hover': {
                                    borderColor: 'primary.main',
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                                  },
                                }),
                          }}
                        >
                          <Typography variant="caption" fontWeight={800}>
                            {new Intl.DateTimeFormat('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            }).format(new Date(s.startTime))}
                          </Typography>
                        </Button>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Stack>
    </Box>
  )
}
