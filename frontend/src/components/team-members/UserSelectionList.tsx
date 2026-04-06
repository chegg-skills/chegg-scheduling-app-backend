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
import type { SafeUser } from '@/types'

interface UserSelectionListProps {
    users: SafeUser[]
    selectedUserIds: string[]
    onToggle: (id: string) => void
    error?: boolean
}

export function UserSelectionList({
    users,
    selectedUserIds,
    onToggle,
    error,
}: UserSelectionListProps) {
    return (
        <Box
            sx={{
                maxHeight: 280,
                overflowY: 'auto',
                border: '1px solid',
                borderColor: error ? 'error.main' : 'divider',
                borderRadius: 1.5,
            }}
        >
            <List disablePadding>
                {users.length === 0 ? (
                    <ListItem>
                        <ListItemText
                            primary="No selectable members found."
                            sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}
                        />
                    </ListItem>
                ) : (
                    users.map((option) => (
                        <ListItem key={option.id} disablePadding>
                            <ListItemButton onClick={() => onToggle(option.id)} dense>
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    <Checkbox
                                        edge="start"
                                        checked={selectedUserIds.includes(option.id)}
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
                                        {option.firstName[0]}
                                        {option.lastName[0]}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={`${option.firstName} ${option.lastName}`}
                                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                    secondary={option.email}
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
