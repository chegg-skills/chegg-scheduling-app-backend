import { useState } from 'react'
import { Box, alpha, Tabs, Tab } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import type { Booking } from '@/types'
import { useSessionLogDraft } from './details/useSessionLogDraft'
import { ProblemContextTab } from './details/ProblemContextTab'
import { SessionNotesTab } from './details/SessionNotesTab'
import { BookingTimelineTab } from './details/BookingTimelineTab'

interface BookingDetailsRightSectionProps {
  booking: Booking
}

export function BookingDetailsRightSection({ booking }: BookingDetailsRightSectionProps) {
  const theme = useTheme()
  const [activeTab, setActiveTab] = useState(0)
  const draft = useSessionLogDraft(booking)

  return (
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        minHeight: { md: '360px', xs: 'auto' },
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
      <Box
        sx={{
          position: { md: 'absolute', xs: 'static' },
          top: { md: 20, xs: 'auto' },
          bottom: { md: 20, xs: 'auto' },
          left: { md: 20, xs: 'auto' },
          right: { md: 20, xs: 'auto' },
          display: 'flex',
          flexDirection: 'column',
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
            <Tab label="Timeline" />
            <Tab label="Questions" />
            <Tab label={booking.scheduleSlotId ? 'Session Notes' : (draft.log ? 'Session Notes' : 'Log Session')} />
          </Tabs>
        </Box>

        {activeTab === 0 && <BookingTimelineTab booking={booking} />}

        {activeTab === 1 && <ProblemContextTab booking={booking} />}

        {activeTab === 2 && <SessionNotesTab booking={booking} draft={draft} />}
      </Box>
    </Box>
  )
}
