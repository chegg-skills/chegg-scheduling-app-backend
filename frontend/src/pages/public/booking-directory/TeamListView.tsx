import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import { ChevronLeft, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { PublicBookingDirectorySection } from '@/types'
import { toTitleCase } from '@/utils/toTitleCase'
import { DirectoryTeamCard } from './DirectoryTeamCard'

interface TeamListViewProps {
  eventTypeKey: string | undefined
  selectedSection: PublicBookingDirectorySection
}

/** Step 2 — teams participating under a selected session category. */
export function TeamListView({ eventTypeKey, selectedSection }: TeamListViewProps) {
  const navigate = useNavigate()
  const handleBook = (eventSlug: string) => navigate(`/book/event/${eventSlug}`)

  return (
    <Box>
      <Box
        role="button"
        tabIndex={0}
        onClick={() => navigate('/book/sessions')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') navigate('/book/sessions')
        }}
        sx={{
          mb: 4,
          display: 'inline-flex',
          alignItems: 'center',
          color: 'primary.main',
          fontWeight: 700,
          fontSize: '0.875rem',
          cursor: 'pointer',
          userSelect: 'none',
          '&:hover': {
            textDecoration: 'underline',
          },
        }}
      >
        <ChevronLeft size={16} style={{ marginRight: 6 }} />
        Back to all session categories
      </Box>

      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}
      >
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
          {toTitleCase(selectedSection.eventType.name)}
        </Typography>
        <Chip
          label={`${selectedSection.teams.length} discipline${selectedSection.teams.length !== 1 ? 's' : ''} available`}
          size="small"
          sx={{
            height: 22,
            fontSize: '0.75rem',
            fontWeight: 600,
            bgcolor: 'accent.peach',
            color: 'primary.main',
            border: '1px solid',
            borderColor: 'primary.light',
          }}
        />
      </Stack>
      <Typography
        variant="subtitle2"
        color="text.secondary"
        sx={{ mb: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}
      >
        Select a discipline or team
      </Typography>

      {selectedSection.teams.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: 6,
            textAlign: 'center',
            bgcolor: 'grey.50',
            borderStyle: 'dashed',
            borderColor: 'divider',
            borderRadius: 1.5,
            maxWidth: '540px',
            mx: 'auto',
            mt: 2,
          }}
        >
          <Users size={40} style={{ opacity: 0.3, marginBottom: 16, color: '#E87100' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
            No participating teams available
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.5 }}>
            There are currently no active disciplines or teams configured to host bookings under
            this category. Please check back later or contact your coordinator.
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 2, sm: 3 },
            gridTemplateColumns: {
              xs: '1fr',
              md: '1fr 1fr',
            },
          }}
        >
          {selectedSection.teams.map((entry) => (
            <DirectoryTeamCard
              key={entry.team.id}
              entry={entry}
              onSelect={() => {
                if (entry.events.length === 1) {
                  handleBook(entry.events[0].publicBookingSlug ?? entry.events[0].id)
                } else {
                  navigate(
                    `/book/sessions/${eventTypeKey}/${entry.team.publicBookingSlug ?? entry.team.id}`
                  )
                }
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}
