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
} from '@mui/material'
import { ChevronDown, ChevronUp, XCircle, Clock, User, MapPin, FileText } from 'lucide-react'
import type { Booking, BookingStatus } from '@/types'
import { BookingStatusBadge } from './BookingStatusBadge'
import { useConfirm } from '@/context/ConfirmContext'
import { useUpdateBookingStatus } from '@/hooks/useBookings'

interface RowProps {
    booking: Booking
    onUpdateStatus: (id: string, status: BookingStatus) => void
    isExpanded: boolean
    onToggle: () => void
}

function BookingRow({ booking, onUpdateStatus, isExpanded, onToggle }: RowProps) {
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
                    bgcolor: isExpanded ? 'grey.50' : 'inherit',
                    transition: 'background-color 0.2s ease'
                }}
            >
                <TableCell>
                    <Typography variant="body2" fontWeight={600}>{booking.studentName}</Typography>
                    <Typography variant="caption" color="text.secondary">{booking.studentEmail}</Typography>
                </TableCell>
                <TableCell>{booking.event?.name || 'Unknown Event'}</TableCell>
                <TableCell>
                    {booking.host ? `${booking.host.firstName} ${booking.host.lastName}` : 'N/A'}
                </TableCell>
                <TableCell>
                    <Typography variant="body2">
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
                            color: isExpanded ? 'primary.main' : 'text.secondary'
                        }}
                    >
                        Details
                    </Button>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ py: 3, px: 2, bgcolor: 'grey.50', borderTop: '1px solid', borderColor: 'grey.250' }}>
                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <FileText size={16} /> Detailed Booking Information
                            </Typography>

                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
                                <Box>
                                    <Stack spacing={2}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                                <User size={12} /> Student & Session
                                            </Typography>
                                            <Typography variant="body2" fontWeight={700}>{booking.studentName}</Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{booking.studentEmail}</Typography>
                                            <Typography variant="body2" sx={{ mt: 1 }}>{booking.event?.name} • {booking.team?.name}</Typography>
                                        </Box>

                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                                <Clock size={12} /> Scheduling
                                            </Typography>
                                            <Typography variant="body2" fontWeight={600}>
                                                {new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(startTime)}
                                            </Typography>
                                            <Typography variant="body2">
                                                {new Intl.DateTimeFormat('en-US', { timeStyle: 'short' }).format(startTime)} ({booking.event?.durationSeconds ? booking.event.durationSeconds / 60 : 0} mins)
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">Zone: {booking.timezone}</Typography>
                                        </Box>

                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                                <MapPin size={12} /> Logistics
                                            </Typography>
                                            <Typography variant="body2" fontWeight={600}>
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

                                <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 2 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 2, display: 'block', textTransform: 'uppercase' }}>
                                        Student Problem Context
                                    </Typography>
                                    <Stack spacing={2}>
                                        <Box>
                                            <Typography variant="caption" fontWeight={600} color="primary.main">Specific Question</Typography>
                                            <Typography variant="body2">{booking.specificQuestion || 'None provided'}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" fontWeight={600} color="primary.main">Attempted Solutions</Typography>
                                            <Typography variant="body2">{booking.triedSolutions || 'None provided'}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" fontWeight={600} color="primary.main">Resources Used</Typography>
                                            <Typography variant="body2">{booking.usedResources || 'None provided'}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" fontWeight={600} color="primary.main">Session Objectives</Typography>
                                            <Typography variant="body2">{booking.sessionObjectives || 'None provided'}</Typography>
                                        </Box>
                                        {booking.notes && (
                                            <Box>
                                                <Typography variant="caption" fontWeight={600} color="text.secondary">Additional Notes</Typography>
                                                <Typography variant="body2">{booking.notes}</Typography>
                                            </Box>
                                        )}
                                    </Stack>
                                </Box>
                            </Box>

                            <Divider sx={{ my: 3 }} />

                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto', alignSelf: 'center' }}>
                                    Timezone: {booking.timezone}
                                </Typography>
                                {booking.status === 'CONFIRMED' && (
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        startIcon={<XCircle size={16} />}
                                        onClick={() => handleAction('CANCELLED', 'Cancel')}
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
            <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 3, borderStyle: 'dashed' }}>
                <Typography color="text.secondary">No bookings scheduled yet.</Typography>
            </Paper>
        )
    }

    return (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.3, overflow: 'hidden' }}>
            <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.50' }}>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Event</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Host</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 110, textAlign: 'right' }} />
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
