import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Avatar from '@mui/material/Avatar'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import {
    Mail,
    MapPin,
    Clock,
    Phone,
    Users,
    Calendar,
    AlertCircle
} from 'lucide-react'
import type { UserWithDetails } from '@/types'
import { Badge } from '@/components/shared/Badge'

interface UserDetailViewProps {
    user: UserWithDetails
}

interface TabPanelProps {
    children?: React.ReactNode
    index: number
    value: number
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`user-tabpanel-${index}`}
            aria-labelledby={`user-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ py: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    )
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(new Date(date))
}

export function UserDetailView({ user }: UserDetailViewProps) {
    const [tabValue, setTabValue] = React.useState(0)

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue)
    }

    const roleColor = {
        SUPER_ADMIN: 'error' as const,
        TEAM_ADMIN: 'warning' as const,
        COACH: 'info' as const,
    }

    return (
        <Box>
            {/* Header Info */}
            <Stack direction="row" spacing={3} alignItems="flex-start" sx={{ mb: 4 }}>
                <Avatar
                    src={user.avatarUrl ?? undefined}
                    sx={{
                        width: 80,
                        height: 80,
                        fontSize: '2rem',
                        bgcolor: 'primary.light',
                        color: 'primary.dark'
                    }}
                >
                    {user.firstName[0]}{user.lastName[0]}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="h5" fontWeight={700}>
                            {user.firstName} {user.lastName}
                        </Typography>
                        <Chip
                            label={user.role.replace(/_/g, ' ')}
                            size="small"
                            color={roleColor[user.role]}
                            variant="outlined"
                            sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.625rem' }}
                        />
                        {!user.isActive && (
                            <Badge label="Inactive" variant="red" />
                        )}
                    </Stack>

                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
                                <Mail size={16} />
                                <Typography variant="body2">{user.email}</Typography>
                            </Stack>
                        </Grid>
                        {user.phoneNumber && (
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
                                    <Phone size={16} />
                                    <Typography variant="body2">{user.phoneNumber}</Typography>
                                </Stack>
                            </Grid>
                        )}
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
                                <MapPin size={16} />
                                <Typography variant="body2">{user.country ?? 'Not specified'}</Typography>
                            </Stack>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
                                <Clock size={16} />
                                <Typography variant="body2">{user.timezone.replace(/_/g, ' ')} (UTC)</Typography>
                            </Stack>
                        </Grid>
                    </Grid>
                </Box>
            </Stack>

            <Divider />

            <Tabs
                value={tabValue}
                onChange={handleTabChange}
                sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                    '& .MuiTab-root': {
                        textTransform: 'none',
                        fontWeight: 600,
                        minWidth: 100
                    }
                }}
            >
                <Tab label="Teams" icon={<Users size={18} />} iconPosition="start" />
                <Tab label="Events" icon={<Calendar size={18} />} iconPosition="start" />
                <Tab label="Availability" icon={<Clock size={18} />} iconPosition="start" />
            </Tabs>

            {/* Teams Tab */}
            <TabPanel value={tabValue} index={0}>
                {user.teamMemberships.length > 0 ? (
                    <Grid container spacing={2}>
                        {user.teamMemberships.map((membership) => (
                            <Grid size={{ xs: 12, sm: 6 }} key={membership.id}>
                                <Paper variant="outlined" sx={{ p: 2, '&:hover': { bgcolor: 'action.hover' } }}>
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        {membership.team.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                        Joined {formatDate(membership.team.createdAt)}
                                    </Typography>
                                    {membership.team.description && (
                                        <Typography variant="body2" color="text.secondary" noWrap>
                                            {membership.team.description}
                                        </Typography>
                                    )}
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Users size={40} color="#ccc" style={{ marginBottom: 8 }} />
                        <Typography color="text.secondary">This user is not a member of any teams.</Typography>
                    </Box>
                )}
            </TabPanel>

            {/* Events Tab */}
            <TabPanel value={tabValue} index={1}>
                {user.hostedEvents.length > 0 ? (
                    <List disablePadding>
                        {user.hostedEvents.map((host) => (
                            <ListItem
                                key={host.id}
                                divider
                                sx={{
                                    borderRadius: 1,
                                    mb: 1,
                                    '&:last-child': { borderBottom: 0 }
                                }}
                            >
                                <ListItemText
                                    primary={
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography variant="subtitle2" fontWeight={700}>
                                                {host.event.name}
                                            </Typography>
                                            <Badge label={host.event.offering.name} variant="blue" />
                                        </Stack>
                                    }
                                    secondary={
                                        <Typography variant="caption" color="text.secondary">
                                            {host.event.interactionType.name} • {Math.round(host.event.durationSeconds / 60)} mins
                                        </Typography>
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Calendar size={40} color="#ccc" style={{ marginBottom: 8 }} />
                        <Typography color="text.secondary">This user is not hosting any events.</Typography>
                    </Box>
                )}
            </TabPanel>

            {/* Availability Tab */}
            <TabPanel value={tabValue} index={2}>
                <Grid container spacing={4}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Clock size={18} /> Weekly Schedule
                        </Typography>
                        <Paper variant="outlined">
                            <List disablePadding>
                                {DAYS.map((day, idx) => {
                                    const slots = user.weeklyAvailability.filter(a => a.dayOfWeek === idx)
                                    return (
                                        <ListItem key={day} divider={idx < 6}>
                                            <ListItemText
                                                primary={day}
                                                sx={{ flex: '0 0 120px' }}
                                            />
                                            <Box>
                                                {slots.length > 0 ? (
                                                    slots.map((slot, sIdx) => (
                                                        <Chip
                                                            key={sIdx}
                                                            label={`${slot.startTime} - ${slot.endTime}`}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{ mr: 0.5 }}
                                                        />
                                                    ))
                                                ) : (
                                                    <Typography variant="caption" color="text.secondary italic">Unavailable</Typography>
                                                )}
                                            </Box>
                                        </ListItem>
                                    )
                                })}
                            </List>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AlertCircle size={18} /> Exceptions
                        </Typography>
                        {user.availabilityExceptions.length > 0 ? (
                            <List disablePadding>
                                {user.availabilityExceptions.map((ex) => (
                                    <Paper
                                        key={ex.id}
                                        variant="outlined"
                                        sx={{
                                            p: 1.5,
                                            mb: 1,
                                            borderLeft: 4,
                                            borderColor: 'divider',
                                            borderLeftColor: ex.isUnavailable ? '#94a3b8' : 'primary.main',
                                            bgcolor: 'background.paper'
                                        }}
                                    >
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Box>
                                                <Typography variant="body2" fontWeight={600} color="text.primary">
                                                    {formatDate(ex.date)}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {ex.isUnavailable ? 'Unavailable' : `${ex.startTime} - ${ex.endTime}`}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={ex.isUnavailable ? 'Off' : 'Override'}
                                                size="small"
                                                variant="outlined"
                                                sx={{
                                                    fontWeight: 700,
                                                    fontSize: '0.625rem',
                                                    textTransform: 'uppercase',
                                                    color: ex.isUnavailable ? 'text.secondary' : 'primary.main',
                                                    borderColor: 'divider'
                                                }}
                                            />
                                        </Stack>
                                    </Paper>
                                ))}
                            </List>
                        ) : (
                            <Box sx={{ textAlign: 'center', py: 4, bgcolor: 'action.hover', borderRadius: 1 }}>
                                <Typography variant="body2" color="text.secondary">No upcoming exceptions.</Typography>
                            </Box>
                        )}
                    </Grid>
                </Grid>
            </TabPanel>
        </Box>
    )
}
