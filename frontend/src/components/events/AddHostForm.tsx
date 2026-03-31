import { useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Checkbox from '@mui/material/Checkbox'
import Typography from '@mui/material/Typography'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemText from '@mui/material/ListItemText'
import Avatar from '@mui/material/Avatar'
import { Square, CheckSquare } from 'lucide-react'
import type { TeamMember, EventHost } from '@/types'
import { Button } from '@/components/shared/Button'
import { Badge } from '@/components/shared/Badge'

interface AddHostFormProps {
    activeHosts: EventHost[]
    teamMembers: TeamMember[]
    assignmentStrategy?: string
    isPending: boolean
    onAdd: (userIds: string[]) => void
    onCancel: () => void
}

export function AddHostForm({
    activeHosts,
    teamMembers,
    assignmentStrategy,
    isPending,
    onAdd,
    onCancel,
}: AddHostFormProps) {
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
    const [search, setSearch] = useState('')

    const currentHostUserIds = new Set(activeHosts.map((h) => h.hostUserId))
    const eligible = teamMembers.filter(
        (m) => m.isActive && m.user.role !== 'SUPER_ADMIN' && !currentHostUserIds.has(m.userId),
    )

    const filteredEligible = eligible.filter((m) =>
        `${m.user.firstName} ${m.user.lastName} ${m.user.email}`.toLowerCase().includes(search.toLowerCase()),
    )

    return (
        <Stack spacing={3}>
            <Box>
                <Typography variant="body2" color="text.secondary" mb={1}>
                    Select one or more coaches to add to this event.
                </Typography>
                {assignmentStrategy === 'ROUND_ROBIN' && activeHosts.length + selectedUserIds.length < 2 && (
                    <Typography variant="caption" color="error.main" sx={{ display: 'block', mb: 1, fontWeight: 500 }}>
                        Note: Round Robin events require at least 2 hosts.
                    </Typography>
                )}
                <Stack spacing={1.5} sx={{ width: '100%' }}>
                    {selectedUserIds.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selectedUserIds.map((id) => {
                                const user = teamMembers.find((m) => m.userId === id)?.user
                                if (!user) return null
                                return <Badge key={id} label={`${user.firstName} ${user.lastName}`} variant="blue" />
                            })}
                        </Box>
                    )}

                    <TextField
                        size="small"
                        placeholder="Search coaches by name or email…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 1.5,
                            },
                        }}
                    />

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
                            {filteredEligible.length === 0 ? (
                                <ListItem>
                                    <ListItemText
                                        primary="No selectable coaches found."
                                        sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}
                                    />
                                </ListItem>
                            ) : (
                                filteredEligible.map((option) => (
                                    <ListItem key={option.userId} disablePadding>
                                        <ListItemButton
                                            onClick={() => {
                                                setSelectedUserIds((prev) =>
                                                    prev.includes(option.userId)
                                                        ? prev.filter((id) => id !== option.userId)
                                                        : [...prev, option.userId],
                                                )
                                            }}
                                            dense
                                        >
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
                </Stack>
            </Box>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button variant="secondary" onClick={onCancel} disabled={isPending}>
                    Cancel
                </Button>
                <Button
                    onClick={() => onAdd(selectedUserIds)}
                    isLoading={isPending}
                    disabled={selectedUserIds.length === 0}
                >
                    Add coaches
                </Button>
            </Stack>
        </Stack>
    )
}
