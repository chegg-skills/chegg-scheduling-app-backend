import Box from '@mui/material/Box'
import { getUserInitials } from '@/utils/userDisplay'
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

interface CoachSelectionListProps {
  eligibleCoaches: TeamMember[]
  selectedUserIds: string[]
  onToggle: (userId: string) => void
  activeCoachId?: string | null
  onSelectCoach?: (userId: string) => void
}

export function CoachSelectionList({
  eligibleCoaches,
  selectedUserIds,
  onToggle,
  activeCoachId,
  onSelectCoach,
}: CoachSelectionListProps) {
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
        {eligibleCoaches.length === 0 ? (
          <ListItem>
            <ListItemText
              primary="No selectable coaches found."
              sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}
            />
          </ListItem>
        ) : (
          eligibleCoaches.map((option) => {
            const isSelected = selectedUserIds.includes(option.userId)
            const isActive = activeCoachId === option.userId
            return (
              <ListItem key={option.userId} disablePadding>
                <ListItemButton
                  onClick={() => {
                    if (onSelectCoach) {
                      onSelectCoach(option.userId)
                    }
                    if (!isSelected) {
                      onToggle(option.userId)
                    }
                  }}
                  selected={isActive}
                  dense
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Checkbox
                      edge="start"
                      checked={isSelected}
                      tabIndex={-1}
                      disableRipple
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggle(option.userId)
                      }}
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
                        bgcolor: isActive ? 'primary.main' : 'primary.light',
                        color: isActive ? 'primary.contrastText' : 'primary.dark',
                      }}
                    >
                      {getUserInitials(option.user.firstName, option.user.lastName)}
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
            )
          })
        )}
      </List>
    </Box>
  )
}
