import Chip from '@mui/material/Chip'
import { Users, BookOpen } from 'lucide-react'
import type { PublicBookingDirectoryTeam } from '@/types'
import { toTitleCase } from '@/utils/toTitleCase'
import { DirectoryCard } from './DirectoryCard'

interface DirectoryTeamCardProps {
  entry: PublicBookingDirectoryTeam
  onSelect: () => void
}

/** Team card shown in the directory's Step 2 (team list) view. */
export function DirectoryTeamCard({ entry, onSelect }: DirectoryTeamCardProps) {
  return (
    <DirectoryCard
      icon={<Users size={24} />}
      title={toTitleCase(entry.team.name)}
      description={entry.team.description}
      placeholder="Click to view available sessions"
      chip={
        <Chip
          icon={<BookOpen size={12} />}
          label={`${entry.events.length} session${entry.events.length !== 1 ? 's' : ''} available`}
          size="small"
          sx={{
            height: 22,
            fontSize: '0.7rem',
            fontWeight: 600,
            bgcolor: 'primary.light',
            color: 'primary.main',
            '& .MuiChip-icon': { color: 'inherit' },
          }}
        />
      }
      onClick={onSelect}
    />
  )
}
