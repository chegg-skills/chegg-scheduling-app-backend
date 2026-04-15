import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemText from '@mui/material/ListItemText'
import Avatar from '@mui/material/Avatar'
import Checkbox from '@mui/material/Checkbox'
import { Square, CheckSquare } from 'lucide-react'
import type { TeamMember } from '@/types'

interface HostSelectionListProps {
  eligibleHosts: TeamMember[]
  selectedUserIds: string[]
  onToggle: (userId: string) => void
}

export function HostSelectionList({
  eligibleHosts,
  selectedUserIds,
  onToggle,
}: HostSelectionListProps) {
  return (
    <Box
      sx={{
        maxHeight: 280,
        overflowY: 'auto',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
      }}
    >
      <List disablePadding>
        {eligibleHosts.length === 0 ? (
          <ListItem>
            <ListItemText
              primary="No selectable coaches found."
              sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}
            />
          </ListItem>
        ) : (
          eligibleHosts.map((option) => (
            <ListItem key={option.userId} disablePadding>
              <ListItemButton onClick={() => onToggle(option.userId)} dense>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Checkbox
                    edge="start"
                    checked={selectedUserIds.includes(option.userId)}
                    tabIndex={-1}
                    disableRipple
                    icon={<Square size={20} />}
                    checkedIcon={<CheckSquare size={20} />}
                  />
                </ListItemIcon>
                <ListItemAvatar sx={{ minWidth: 48 }}>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      fontSize: '0.75rem',
                      bgcolor: 'primary.light',
                      color: 'primary.dark',
                    }}
                  >
                    {option.user.firstName[0]}
                    {option.user.lastName[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${option.user.firstName} ${option.user.lastName}`}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                  secondary={option.user.email}
                  secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                />
              </ListItemButton>
            </ListItem>
          ))
        )}
      </List>
    </Box>
  )
}
