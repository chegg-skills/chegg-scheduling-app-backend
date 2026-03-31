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
} from '@mui/material'
import { ChevronDown, ChevronUp, XCircle, Clock, User, MapPin, FileText } from 'lucide-react'
import type { Booking, BookingStatus } from '@/types'
import { BookingStatusBadge } from './BookingStatusBadge'
import { useConfirm } from '@/context/ConfirmContext'
import { useUpdateBookingStatus } from '@/hooks/useBookings'
import { useTheme } from '@mui/material/styles'

interface RowProps {
    booking: Booking
    onUpdateStatus: (id: string, status: BookingStatus) => void
    isExpanded: boolean
    onToggle: () => void
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

    return (
        <>
            <TableRow
                hover
                sx={{
                    '& > *': { borderBottom: 'unset' },
                    bgcolor: isExpanded ? alpha(theme.palette.secondary.main, 0.03) : 'inherit',
                    transition: 'background-color 0.2s ease'
                }}
            >
                <TableCell>
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
                <TableCell sx={{ fontSize: '0.875rem' }}>{booking.event?.name || 'Unknown Event'}</TableCell>
                <TableCell sx={{ fontSize: '0.875rem' }}>
                    {booking.host ? `${booking.host.firstName} ${booking.host.lastName}` : 'N/A'}
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
                                <FileText size={16} /> Detailed Booking Information
                            </Typography>

                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
                                <Box>
                                    <Stack spacing={2.5}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                                                <User size={12} /> Student & Session
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{booking.studentName}</Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{booking.studentEmail}</Typography>
                                            <Typography variant="body2" sx={{ mt: 1, color: 'text.primary' }}>{booking.event?.name} • {booking.team?.name}</Typography>
                                        </Box>

                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                                                <Clock size={12} /> Scheduling
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(startTime)}
                                            </Typography>
                                            <Typography variant="body2" color="text.primary">
                                                {new Intl.DateTimeFormat('en-US', { timeStyle: 'short' }).format(startTime)} ({booking.event?.durationSeconds ? booking.event.durationSeconds / 60 : 0} mins)
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">Zone: {booking.timezone.replace(/_/g, ' ')}</Typography>
                                        </Box>

                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                                                <MapPin size={12} /> Logistics
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {booking.event?.locationType === 'VIRTUAL' ? 'Virtual' : 'In-Person'}: {booking.event?.locationValue}
                                            </Typography>
                                            <Typography variant="body2">
                                                Host: {booking.host ? `${booking.host.firstName} ${booking.host.lastName}` : 'N/A'}
                                            </Typography>
                                            {booking.host?.email && (
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                    {booking.host.email}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Stack>
                                </Box>

                                <Box sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.03), p: 2.5, borderRadius: 2, border: `1px solid ${alpha(theme.palette.secondary.main, 0.05)}` }}>
                                    <Typography variant="caption" sx={{ fontWeight: 700, mb: 2, display: 'block', textTransform: 'uppercase', color: theme.palette.secondary.main, letterSpacing: '0.05em' }}>
                                        Student Problem Context
                                    </Typography>
                                    <Stack spacing={2}>
                                        <Box>
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.primary.main, display: 'block', textTransform: 'uppercase', fontSize: '0.65rem', mb: 0.5 }}>Specific Question</Typography>
                                            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>{booking.specificQuestion || 'None provided'}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.primary.main, display: 'block', textTransform: 'uppercase', fontSize: '0.65rem', mb: 0.5 }}>Attempted Solutions</Typography>
                                            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>{booking.triedSolutions || 'None provided'}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.primary.main, display: 'block', textTransform: 'uppercase', fontSize: '0.65rem', mb: 0.5 }}>Resources Used</Typography>
                                            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>{booking.usedResources || 'None provided'}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.primary.main, display: 'block', textTransform: 'uppercase', fontSize: '0.65rem', mb: 0.5 }}>Session Objectives</Typography>
                                            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>{booking.sessionObjectives || 'None provided'}</Typography>
                                        </Box>
                                    </Stack>
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
                            { label: 'Student', width: '25%' },
                            { label: 'Event', width: '20%' },
                            { label: 'Host', width: '20%' },
                            { label: 'Date / Time', width: '20%' },
                            { label: 'Status', width: '15%' },
                            { label: '', width: 50 },
                        ].map((col) => (
                            <TableCell
                                key={col.label}
                                sx={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    color: 'text.secondary',
                                    letterSpacing: '0.05em',
                                    width: col.width,
                                }}
                            >
                                {col.label}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {bookings.map((booking) => (
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
