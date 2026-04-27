import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import { Edit, Eye, EyeOff, Trash2, Users } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import { Badge } from '@/components/shared/ui/Badge'
import { RowActions } from '@/components/shared/table/RowActions'
import { PublicBookingLinkCell } from '@/components/shared/PublicBookingLinkCell'
import { toTitleCase } from '@/utils/toTitleCase'
import type { Team } from '@/types'

interface TeamTableRowProps {
  canManageTeam: boolean
  onDelete: (team: Team) => void | Promise<void>
  onEdit: (team: Team) => void
  onToggleActive: (team: Team) => void | Promise<void>
  team: Team
}

export function TeamTableRow({
  canManageTeam,
  onDelete,
  onEdit,
  onToggleActive,
  team,
}: TeamTableRowProps) {
  return (
    <TableRow hover>
      <TableCell>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: 2,
              bgcolor: 'secondary.light',
              color: 'secondary.dark',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={20} />
          </Box>

          <Link
            component={RouterLink}
            to={`/teams/${team.id}`}
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              textDecoration: 'none',
              '&:hover': { color: 'primary.main', textDecoration: 'underline' },
            }}
          >
            {toTitleCase(team.name)}
          </Link>
        </Stack>
      </TableCell>

      <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
        {team.description ?? 'No description provided'}
      </TableCell>

      <TableCell>
        <Badge
          label={team.isActive ? 'Active' : 'Inactive'}
          color={team.isActive ? 'green' : 'red'}
        />
      </TableCell>
      <TableCell>
        <PublicBookingLinkCell type="team" slug={team.publicBookingSlug} isActive={team.isActive} />
      </TableCell>

      <TableCell>
        {canManageTeam && (
          <RowActions
            actions={[
              {
                label: 'Edit team details',
                icon: <Edit size={16} />,
                onClick: () => onEdit(team),
              },
              {
                label: team.isActive ? 'Mark as inactive' : 'Mark as active',
                icon: team.isActive ? <EyeOff size={16} /> : <Eye size={16} />,
                onClick: () => onToggleActive(team),
              },
              {
                label: 'Delete team',
                icon: <Trash2 size={16} />,
                color: 'error.main',
                onClick: () => onDelete(team),
              },
            ]}
          />
        )}
      </TableCell>
    </TableRow>
  )
}
