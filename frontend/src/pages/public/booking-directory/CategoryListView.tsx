import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import { Tag } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { PublicBookingDirectorySection } from '@/types'
import { DirectoryCategoryCard } from './DirectoryCategoryCard'

interface CategoryListViewProps {
  visibleSections: PublicBookingDirectorySection[]
}

/** Step 1 — session categories. Also renders the "nothing configured" empty state. */
export function CategoryListView({ visibleSections }: CategoryListViewProps) {
  const navigate = useNavigate()

  if (visibleSections.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
        <Tag size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          No sessions configured yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Sessions will appear here once your administrator configures this booking directory.
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}
      >
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
          Select a Session Category
        </Typography>
        <Chip
          label={`${visibleSections.length} available`}
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
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4, fontWeight: 500 }}>
        Choose a category below to view participating teams and book your session.
      </Typography>

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
        {visibleSections.map((section) => (
          <DirectoryCategoryCard
            key={section.eventType.id}
            section={section}
            onSelect={() => navigate(`/book/sessions/${section.eventType.key}`)}
          />
        ))}
      </Box>
    </Box>
  )
}
