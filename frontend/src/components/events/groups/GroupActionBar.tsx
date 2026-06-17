import { useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import { alpha } from '@mui/material/styles'
import { Edit, Trash2, Plus, MoreVertical, ExternalLink, Copy, Check } from 'lucide-react'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import type { EventGroup } from '@/types'

interface GroupActionBarProps {
  currentGroup: EventGroup | null
  themeColor: string
  canManage: boolean
  onEdit: (group: EventGroup) => void
  onDelete: (group: EventGroup) => void
  onCreateNew: () => void
}

/**
 * Right side of the group control panel: open / copy booking-link actions for
 * the active group, the manager-only settings menu (rename / delete), and the
 * "create group" button shown on the `all` / `ungrouped` tabs.
 */
export function GroupActionBar({
  currentGroup,
  themeColor,
  canManage,
  onEdit,
  onDelete,
  onCreateNew,
}: GroupActionBarProps) {
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const isMenuOpen = Boolean(menuAnchorEl)
  const { copied, copy } = useCopyToClipboard()

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setMenuAnchorEl(null)
  }

  const handleCopy = async () => {
    if (currentGroup?.publicBookingSlug) {
      const shareUrl = `${window.location.origin}/book/group/${currentGroup.publicBookingSlug}`
      await copy(shareUrl)
    }
  }

  return (
    <Box sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}>
      {currentGroup ? (
        <Stack direction="row" spacing={1.25} alignItems="center">
          {/* Always show Open and Copy booking page actions when currentGroup exists */}
          <Tooltip title="Open group booking page" arrow placement="top">
            <IconButton
              disabled={!currentGroup.publicBookingSlug}
              onClick={() => {
                const shareUrl = `${window.location.origin}/book/group/${currentGroup.publicBookingSlug}`
                window.open(shareUrl, '_blank', 'noopener,noreferrer')
              }}
              sx={{
                border: '1px solid',
                borderColor: alpha(themeColor, 0.2),
                borderRadius: 1.2,
                width: 28,
                height: 28,
                color: themeColor,
                bgcolor: 'transparent',
                '&:hover': {
                  bgcolor: alpha(themeColor, 0.08),
                  color: themeColor,
                  borderColor: themeColor,
                  transform: 'scale(1.05)',
                },
                '&.Mui-disabled': {
                  borderColor: alpha(themeColor, 0.1),
                  color: alpha(themeColor, 0.3),
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              <ExternalLink size={14} />
            </IconButton>
          </Tooltip>

          <Tooltip title={copied ? 'Copied!' : 'Copy group booking link'} arrow placement="top">
            <IconButton
              disabled={!currentGroup.publicBookingSlug}
              onClick={handleCopy}
              sx={{
                border: '1px solid',
                borderColor: copied ? 'success.main' : alpha(themeColor, 0.2),
                borderRadius: 1.2,
                width: 28,
                height: 28,
                bgcolor: (theme) =>
                  copied ? alpha(theme.palette.success.main, 0.1) : 'transparent',
                color: (theme) => (copied ? theme.palette.success.main : themeColor),
                '&:hover': {
                  bgcolor: (theme) =>
                    copied ? alpha(theme.palette.success.main, 0.1) : alpha(themeColor, 0.08),
                  color: (theme) => (copied ? theme.palette.success.main : themeColor),
                  borderColor: (theme) => (copied ? theme.palette.success.main : themeColor),
                  transform: 'scale(1.05)',
                },
                '&.Mui-disabled': {
                  borderColor: alpha(themeColor, 0.1),
                  color: alpha(themeColor, 0.3),
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </IconButton>
          </Tooltip>

          {/* Only show settings menu to managers */}
          {canManage && (
            <>
              <Tooltip title="Group settings" arrow placement="top">
                <IconButton
                  size="small"
                  onClick={handleMenuOpen}
                  sx={{
                    width: 28,
                    height: 28,
                    color: themeColor,
                    backgroundColor: 'transparent',
                    border: '1px solid',
                    borderColor: alpha(themeColor, 0.2),
                    '&:hover': {
                      color: themeColor,
                      backgroundColor: alpha(themeColor, 0.08),
                      borderColor: themeColor,
                      transform: 'scale(1.05)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <MoreVertical size={16} />
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={menuAnchorEl}
                open={isMenuOpen}
                onClose={handleMenuClose}
                onClick={handleMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{
                  elevation: 3,
                  sx: {
                    borderRadius: 1.2,
                    mt: 0.75,
                    minWidth: 160,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.06)',
                    '& .MuiMenuItem-root': {
                      fontSize: '0.825rem',
                      py: 1,
                      px: 1.75,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.25,
                    },
                  },
                }}
              >
                <MenuItem
                  onClick={() => {
                    onEdit(currentGroup)
                    handleMenuClose()
                  }}
                  sx={{
                    color: 'text.primary',
                    '&:hover': {
                      backgroundColor: alpha(themeColor, 0.06),
                      color: themeColor,
                    },
                  }}
                >
                  <Edit size={14} style={{ color: themeColor }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Rename Group
                  </Typography>
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    onDelete(currentGroup)
                    handleMenuClose()
                  }}
                  sx={{
                    color: 'error.main',
                    '&:hover': {
                      backgroundColor: (theme) => alpha(theme.palette.error.main, 0.06),
                    },
                  }}
                >
                  <Trash2 size={14} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Delete Group
                  </Typography>
                </MenuItem>
              </Menu>
            </>
          )}
        </Stack>
      ) : (
        /* Only show "+" add group button to managers under 'all' / 'ungrouped' */
        canManage && (
          <Tooltip title="Create new event group" arrow placement="top">
            <IconButton
              size="small"
              onClick={onCreateNew}
              sx={{
                width: 28,
                height: 28,
                color: themeColor,
                backgroundColor: 'transparent',
                border: '1px solid',
                borderColor: alpha(themeColor, 0.2),
                '&:hover': {
                  color: themeColor,
                  backgroundColor: alpha(themeColor, 0.08),
                  borderColor: themeColor,
                },
                transition: 'all 0.2s',
              }}
            >
              <Plus size={16} />
            </IconButton>
          </Tooltip>
        )
      )}
    </Box>
  )
}
