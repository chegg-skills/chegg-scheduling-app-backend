import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { Code, Copy, Edit2, Trash2 } from 'lucide-react'

const TRANSFORM_ORIGIN = { horizontal: 'right' as const, vertical: 'top' as const }
const ANCHOR_ORIGIN = { horizontal: 'right' as const, vertical: 'bottom' as const }
const PAPER_SX = {
  minWidth: 150,
  borderRadius: 1.5,
  mt: 0.75,
  border: '1px solid',
  borderColor: 'divider',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
  '& .MuiMenuItem-root': {
    fontSize: '0.825rem',
    py: 1.25,
    px: 1.75,
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    fontWeight: 500,
    transition: 'all 0.15s ease-in-out',
  },
}

interface EventActionsMenuProps {
  anchorEl: HTMLElement | null
  onClose: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onEmbed?: () => void
}

export function EventActionsMenu({
  anchorEl,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onEmbed,
}: EventActionsMenuProps) {
  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      transformOrigin={TRANSFORM_ORIGIN}
      anchorOrigin={ANCHOR_ORIGIN}
      PaperProps={{ elevation: 3, sx: PAPER_SX }}
    >
      <MenuItem
        onClick={onEdit}
        sx={{
          '&:hover': {
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
            color: 'primary.main',
          },
        }}
      >
        <Edit2 size={14} />
        <Typography variant="body2">Edit Event</Typography>
      </MenuItem>

      <MenuItem
        onClick={onDuplicate}
        sx={{
          '&:hover': {
            bgcolor: (theme) => alpha(theme.palette.secondary.main || '#9c27b0', 0.04),
            color: 'secondary.main',
          },
        }}
      >
        <Copy size={14} />
        <Typography variant="body2">Duplicate</Typography>
      </MenuItem>

      {onEmbed && (
        <MenuItem
          onClick={onEmbed}
          sx={{
            '&:hover': {
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
              color: 'primary.main',
            },
          }}
        >
          <Code size={14} />
          <Typography variant="body2">Add to website</Typography>
        </MenuItem>
      )}

      <MenuItem
        onClick={onDelete}
        sx={{
          color: 'error.main',
          '&:hover': { bgcolor: (theme) => alpha(theme.palette.error.main, 0.05) },
        }}
      >
        <Trash2 size={14} />
        <Typography variant="body2">Delete</Typography>
      </MenuItem>
    </Menu>
  )
}
