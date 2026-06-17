import { Typography, Stack, IconButton, Popover } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { Edit, Trash2, ExternalLink } from 'lucide-react'

interface LinkPopoverProps {
  anchor: HTMLAnchorElement | null
  onClose: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  onEdit: () => void
  onRemove: () => void
}

/** Hover/click popover over a link in the editor, with edit / remove / open actions. */
export function LinkPopover({
  anchor,
  onClose,
  onMouseEnter,
  onMouseLeave,
  onEdit,
  onRemove,
}: LinkPopoverProps) {
  return (
    <Popover
      open={Boolean(anchor)}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      disableRestoreFocus
      PaperProps={{
        onMouseEnter,
        onMouseLeave,
        sx: {
          p: 0.75,
          px: 1.25,
          borderRadius: 2, // 8px
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          border: '1px solid',
          borderColor: 'divider',
          pointerEvents: 'auto',
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
        },
      }}
      sx={{
        pointerEvents: 'none',
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Typography
          variant="body2"
          sx={{
            maxWidth: 220,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: 'primary.main',
            fontWeight: 500,
            textDecoration: 'underline',
            userSelect: 'none',
          }}
        >
          {anchor?.getAttribute('href') || ''}
        </Typography>

        <IconButton
          size="small"
          onClick={onEdit}
          sx={{
            p: 0.5,
            borderRadius: 1,
            color: 'text.secondary',
            transition: 'all 0.2s',
            '&:hover': {
              color: 'primary.main',
              bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.08),
            },
          }}
        >
          <Edit size={14} />
        </IconButton>

        <IconButton
          size="small"
          onClick={onRemove}
          sx={{
            p: 0.5,
            borderRadius: 1,
            color: 'text.secondary',
            transition: 'all 0.2s',
            '&:hover': {
              color: 'primary.main',
              bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.08),
            },
          }}
        >
          <Trash2 size={14} />
        </IconButton>

        <IconButton
          size="small"
          component="a"
          href={anchor?.getAttribute('href') || '#'}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            p: 0.5,
            borderRadius: 1,
            color: 'text.secondary',
            transition: 'all 0.2s',
            '&:hover': {
              color: 'primary.main',
              bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.08),
            },
          }}
        >
          <ExternalLink size={14} />
        </IconButton>
      </Stack>
    </Popover>
  )
}
