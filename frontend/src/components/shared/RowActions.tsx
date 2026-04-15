import { useState, MouseEvent } from 'react'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
import { MoreVertical } from 'lucide-react'

export interface Action {
  label: string
  onClick: () => void
  icon?: React.ReactNode
  color?: string
  disabled?: boolean
  tooltip?: string
}

interface RowActionsProps {
  actions: Action[]
}

export function RowActions({ actions }: RowActionsProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleActionClick = (onClick: () => void) => {
    handleClose()
    onClick()
  }

  if (actions.length === 0) return null

  return (
    <div>
      <IconButton
        aria-label="more"
        aria-controls={open ? 'row-menu' : undefined}
        aria-expanded={open ? 'true' : undefined}
        aria-haspopup="true"
        onClick={handleClick}
        size="small"
        sx={{ color: 'text.secondary' }}
      >
        <MoreVertical size={18} />
      </IconButton>
      <Menu
        id="row-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            minWidth: 160,
            mt: 0.5,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            borderRadius: 1.5,
            '& .MuiMenu-list': {
              py: 1,
            },
          },
        }}
      >
        {actions.map((action) => {
          const menuItem = (
            <MenuItem
              key={action.label}
              onClick={() => handleActionClick(action.onClick)}
              disabled={action.disabled}
              sx={{
                px: 2,
                py: 1,
                color: action.color || 'text.primary',
                '& .MuiListItemIcon-root': {
                  color: action.color || 'text.secondary',
                  minWidth: 32,
                },
                '&:hover': {
                  bgcolor:
                    action.color === 'error' || action.color === 'error.main'
                      ? 'error.lighter'
                      : 'action.hover',
                },
              }}
            >
              {action.icon && <ListItemIcon>{action.icon}</ListItemIcon>}
              <ListItemText
                primary={action.label}
                primaryTypographyProps={{
                  variant: 'body2',
                  fontWeight: 500,
                }}
              />
            </MenuItem>
          )

          if (action.tooltip) {
            return (
              <Tooltip key={action.label} title={action.tooltip} placement="left">
                <Box component="span" sx={{ display: 'block' }}>
                  {menuItem}
                </Box>
              </Tooltip>
            )
          }

          return (
            <Box key={action.label} component="span">
              {menuItem}
            </Box>
          )
        })}
      </Menu>
    </div>
  )
}
