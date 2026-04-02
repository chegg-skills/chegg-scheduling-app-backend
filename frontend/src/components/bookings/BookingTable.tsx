import { useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    Collapse,
    Box,
    Button,
    Stack,
    Divider,
    Avatar,
    alpha,
    Link,
} from '@mui/material'
import { ChevronDown, ChevronUp, XCircle, Clock, User, FileText, Video, ExternalLink } from 'lucide-react'
import type { Booking, BookingStatus } from '@/types'
import { BookingStatusBadge } from './BookingStatusBadge'
import { useConfirm } from '@/context/ConfirmContext'
import { useUpdateBookingStatus } from '@/hooks/useBookings'
import { useTheme } from '@mui/material/styles'
import { SortableHeaderCell } from '@/components/shared/SortableHeaderCell'
import { useTableSort, type SortAccessorMap } from '@/hooks/useTableSort'

interface RowProps {
    booking: Booking
    onUpdateStatus: (id: string, status: BookingStatus) => void
    isExpanded: boolean
    onToggle: () => void
}

type BookingSortKey = 'student' | 'event' | 'host' | 'date' | 'status'

const bookingSortAccessors: SortAccessorMap<Booking, BookingSortKey> = {
    student: (booking) => booking.studentName,
    event: (booking) => booking.event?.name ?? '',
    host: (booking) => booking.host ? `${booking.host.firstName} ${booking.host.lastName}` : '',
    date: (booking) => new Date(booking.startTime),
    status: (booking) => booking.status,
}

function BookingRow({ booking, onUpdateStatus, isExpanded, onToggle }: RowProps) {
    const theme = useTheme()
    const { confirm } = useConfirm()

    const handleAction = async (status: BookingStatus, label: string) => {
        const isConfirmed = await confirm({
            title: `${label} Booking`,
            message: `Are you sure you want to ${label.toLowerCase()} the booking for ${booking.studentName}?`,
            confirmText: 'Confirm',
            cancelText: 'Back',
        })

        if (isConfirmed) {
            onUpdateStatus(booking.id, status)
        }
    }

    const now = new Date()
    const startTime = new Date(booking.startTime)
    const tenMinutesAfterStart = new Date(startTime.getTime() + 10 * 60 * 1000)
    const canMarkNoShow = booking.status === 'CONFIRMED' && now >= tenMinutesAfterStart
    const meetingJoinUrl = booking.meetingJoinUrl
        ?? booking.host?.zoomIsvLink
        ?? (booking.event?.locationType === 'VIRTUAL' && booking.event.locationValue.startsWith('http')
            ? booking.event.locationValue
            : null)

    return (
        <>
            <TableRow
                hover
                sx={{
                    bgcolor: isExpanded ? alpha(theme.palette.secondary.main, 0.03) : 'inherit',
                    transition: 'background-color 0.2s ease',
                }}
            >
                <TableCell sx={{ pl: 3 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                            sx={{
                                width: 34,
                                height: 34,
                                fontSize: '0.8125rem',
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                fontWeight: 700,
                            }}
                        >
                            {booking.studentName.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </Avatar>
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{booking.studentName}</Typography>
                            <Typography variant="caption" color="text.secondary">{booking.studentEmail}</Typography>
                        </Box>
                    </Stack>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {booking.event?.name || 'Unknown Event'}
                    </Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {booking.host ? `${booking.host.firstName} ${booking.host.lastName}` : 'N/A'}
                    </Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(startTime)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(startTime)}
                    </Typography>
                </TableCell>
                <TableCell>
                    <BookingStatusBadge status={booking.status} />
                </TableCell>
                <TableCell align="right" width={110}>
                    <Button
                        size="small"
                        onClick={onToggle}
                        endIcon={isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        sx={{
                            color: isExpanded ? 'primary.main' : 'text.secondary',
                            fontWeight: 600
                        }}
                    >
                        Details
                    </Button>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{
                            py: 3,
                            px: 3,
                            bgcolor: alpha(theme.palette.secondary.main, 0.02),
                            borderTop: '1px solid',
                            borderColor: theme.palette.divider,
                        }}>
                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: theme.palette.secondary.main }}>
                                <FileText size={16} /> Session Details & Meeting Access
                            </Typography>

                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
                                <Box>
                                    <Stack spacing={3}>
                                        {/* INVITEE SECTION */}
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                                                INVITEE
                                            </Typography>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Avatar
                                                    sx={{
                                                        width: 44,
                                                        height: 44,
                                                        fontSize: '1rem',
                                                        bgcolor: alpha(theme.palette.secondary.main, 0.08),
                                                        color: theme.palette.secondary.main,
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    {booking.studentName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                                                        {booking.studentName.toLowerCase()}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {booking.studentEmail}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Box>

                                        <Divider flexItem sx={{ borderColor: alpha(theme.palette.secondary.main, 0.08) }} />

                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                                                LOCATION
                                            </Typography>
                                            {meetingJoinUrl ? (
                                                <Box sx={{
                                                    p: 1.5,
                                                    borderRadius: 1.5,
                                                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                                }}>
                                                    <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1.5 }}>
                                                        <Box sx={{
                                                            p: 0.75,
                                                            borderRadius: 1,
                                                            bgcolor: 'primary.main',
                                                            color: 'white',
                                                            display: 'flex'
                                                        }}>
                                                            <Video size={16} />
                                                        </Box>
                                                        <Box sx={{ minWidth: 0 }}>
                                                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.25 }}>
                                                                Zoom ISV Meeting Room
                                                            </Typography>
                                                            <Link
                                                                href={meetingJoinUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                variant="caption"
                                                                sx={{
                                                                    fontWeight: 500,
                                                                    color: 'primary.main',
                                                                    wordBreak: 'break-all',
                                                                    textDecoration: 'none',
                                                                    '&:hover': { textDecoration: 'underline' }
                                                                }}
                                                            >
                                                                {meetingJoinUrl}
                                                            </Link>
                                                        </Box>
                                                    </Stack>
                                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
                                                        <Button
                                                            component="a"
                                                            href={meetingJoinUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            size="small"
                                                            variant="contained"
                                                            sx={{ px: 2.5, py: 0.5, borderRadius: 100, fontSize: '0.75rem', fontWeight: 700 }}
                                                            startIcon={<ExternalLink size={12} />}
                                                        >
                                                            Join session
                                                        </Button>
                                                    </Box>
                                                </Box>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    {booking.event?.locationType === 'VIRTUAL' ? 'Virtual' : 'In-person'}: {booking.event?.locationValue || 'Pending setup'}
                                                </Typography>
                                            )}
                                        </Box>

                                        <Divider flexItem sx={{ borderColor: alpha(theme.palette.secondary.main, 0.08) }} />

                                        {/* SCHEDULING / TIMEZONE */}
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                                                INVITEE TIME ZONE
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
                                                {new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(startTime)}
                                            </Typography>
                                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                                                {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(startTime)}
                                                {booking.event?.durationSeconds && ` (${booking.event.durationSeconds / 60} mins)`}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                {booking.timezone.replace(/_/g, ' ')}
                                            </Typography>
                                        </Box>

                                        <Divider flexItem sx={{ borderColor: alpha(theme.palette.secondary.main, 0.08) }} />

                                        {/* MEETING HOST SECTION */}
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                                                MEETING HOST
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                                Host will attend this meeting
                                            </Typography>
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <Avatar
                                                    src={booking.host?.avatarUrl ?? undefined}
                                                    sx={{
                                                        width: 36,
                                                        height: 36,
                                                        fontSize: '0.875rem',
                                                        bgcolor: alpha(theme.palette.secondary.main, 0.05),
                                                        color: theme.palette.secondary.main,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {booking.host ? `${booking.host.firstName[0]}${booking.host.lastName[0]}` : <User size={18} />}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {booking.host ? `${booking.host.firstName} ${booking.host.lastName}` : 'N/A'}
                                                    </Typography>
                                                    {booking.host?.email && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {booking.host.email}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Stack>
                                        </Box>
                                    </Stack>
                                </Box>

                                <Box sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.03), p: 2.5, borderRadius: 2, border: `1px solid ${alpha(theme.palette.secondary.main, 0.05)}` }}>
                                    <Typography variant="caption" sx={{ fontWeight: 700, mb: 2, display: 'block', textTransform: 'uppercase', color: theme.palette.secondary.main, letterSpacing: '0.05em' }}>
                                        Student Problem Context
                                    </Typography>
                                    <Box sx={{ position: 'relative', overflow: 'hidden' }}>
                                        {/* Vertical Decorative Line */}
                                        <Box sx={{
                                            position: 'absolute',
                                            top: 8,
                                            bottom: 8,
                                            left: 4,
                                            width: '2px',
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            borderRadius: 1
                                        }} />

                                        <Stack spacing={3}>
                                            {[
                                                { label: 'Specific Question', value: booking.specificQuestion },
                                                { label: 'Attempted Solutions', value: booking.triedSolutions },
                                                { label: 'Resources Used', value: booking.usedResources },
                                                { label: 'Session Objectives', value: booking.sessionObjectives }
                                            ].map((item, idx) => (
                                                <Box key={idx} sx={{ position: 'relative', pl: 3.5 }}>
                                                    {/* Dot */}
                                                    <Box sx={{
                                                        position: 'absolute',
                                                        left: 0,
                                                        top: 6,
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: '50%',
                                                        bgcolor: 'primary.main',
                                                        border: `2px solid ${theme.palette.background.paper}`,
                                                        boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`,
                                                        zIndex: 1
                                                    }} />
                                                    <Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.primary.main, display: 'block', textTransform: 'uppercase', fontSize: '0.65rem', mb: 0.5 }}>
                                                        {item.label}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                                                        {item.value || 'None provided'}
                                                    </Typography>
                                                </Box>
                                            ))}
                                        </Stack>
                                    </Box>
                                </Box>
                            </Box>

                            <Divider sx={{ my: 3 }} />

                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto', alignSelf: 'center' }}>
                                    Booking ID: {booking.id.slice(0, 8).toUpperCase()}
                                </Typography>
                                {booking.status === 'CONFIRMED' && (
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        startIcon={<XCircle size={16} />}
                                        onClick={() => handleAction('CANCELLED', 'Cancel')}
                                        sx={{ fontWeight: 600, borderRadius: 1.5 }}
                                    >
                                        Cancel Booking
                                    </Button>
                                )}
                                {canMarkNoShow && (
                                    <Button
                                        variant="contained"
                                        color="warning"
                                        size="small"
                                        startIcon={<Clock size={16} />}
                                        onClick={() => handleAction('NO_SHOW', 'Mark as No Show')}
                                        sx={{ fontWeight: 600, borderRadius: 1.5 }}
                                    >
                                        Mark as No Show
                                    </Button>
                                )}
                            </Box>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    )
}

interface Props {
    bookings: Booking[]
}

export function BookingTable({ bookings }: Props) {
    const { mutate: updateStatus } = useUpdateBookingStatus()
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const { sortedItems: sortedBookings, sortConfig, requestSort } = useTableSort(bookings, bookingSortAccessors)

    const handleToggle = (id: string) => {
        setExpandedId(prev => prev === id ? null : id)
    }

    if (bookings.length === 0) {
        return (
            <Paper variant="outlined" sx={{ p: 8, textAlign: 'center', borderRadius: 3, borderStyle: 'dashed', bgcolor: 'transparent' }}>
                <Typography color="text.secondary" sx={{ fontWeight: 500 }}>No bookings scheduled yet.</Typography>
            </Paper>
        )
    }

    return (
        <TableContainer component={Paper} variant="outlined">
            <Table>
                <TableHead>
                    <TableRow>
                        {[
                            { label: 'Student', sortKey: 'student' as const, width: '25%' },
                            { label: 'Event', sortKey: 'event' as const, width: '20%' },
                            { label: 'Host', sortKey: 'host' as const, width: '20%' },
                            { label: 'Date / Time', sortKey: 'date' as const, width: '20%' },
                            { label: 'Status', sortKey: 'status' as const, width: '15%' },
                        ].map((col) => (
                            <SortableHeaderCell
                                key={col.sortKey}
                                label={col.label}
                                sortKey={col.sortKey}
                                activeSortKey={sortConfig?.key ?? null}
                                direction={sortConfig?.direction ?? 'asc'}
                                onSort={requestSort}
                                width={col.width}
                            />
                        ))}
                        <TableCell
                            align="right"
                            sx={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                color: 'text.secondary',
                                letterSpacing: '0.05em',
                                width: 50,
                                pr: 3
                            }}
                        >
                            Actions
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {sortedBookings.map((booking) => (
                        <BookingRow
                            key={booking.id}
                            booking={booking}
                            onUpdateStatus={(id, status) => updateStatus({ id, status })}
                            isExpanded={expandedId === booking.id}
                            onToggle={() => handleToggle(booking.id)}
                        />
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}
