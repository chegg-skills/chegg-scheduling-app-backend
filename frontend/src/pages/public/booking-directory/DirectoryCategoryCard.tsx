import Chip from '@mui/material/Chip'
import { Users, Tag } from 'lucide-react'
import type { PublicBookingDirectorySection } from '@/types'
import { toTitleCase } from '@/utils/toTitleCase'
import { DirectoryCard } from './DirectoryCard'

interface DirectoryCategoryCardProps {
  section: PublicBookingDirectorySection
  onSelect: () => void
}

/** Session-category card shown in the directory's Step 1 (category list) view. */
export function DirectoryCategoryCard({ section, onSelect }: DirectoryCategoryCardProps) {
  const teamCount = section.teams.length
  const eventType = section.eventType

  return (
    <DirectoryCard
      icon={<Tag size={24} />}
      title={toTitleCase(eventType.name)}
      description={eventType.description}
      placeholder="Click to view details and teams"
      chip={
        <Chip
          icon={<Users size={12} />}
          label={`${teamCount} ${teamCount === 1 ? 'discipline' : 'disciplines'} available`}
          size="small"
          sx={{
            height: 22,
            fontSize: '0.7rem',
            fontWeight: 600,
            bgcolor: 'secondary.light',
            color: 'secondary.main',
            '& .MuiChip-icon': { color: 'inherit' },
          }}
        />
      }
      onClick={onSelect}
    />
  )
}
