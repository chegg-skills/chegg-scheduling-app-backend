import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import { Clock, XCircle, Calendar } from 'lucide-react'
import type { Booking, BookingStatus } from '@/types'
import { Modal } from '@/components/shared/Modal'
import { BookingDetailsPanel } from './BookingDetailsPanel'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useUpdateBookingStatus } from '@/hooks/useBookings'

interface BookingDetailModalProps {
    booking: Booking | null
    onClose: () => void
    onViewHost?: (userId: string) => void
}

export function BookingDetailModal({ booking, onClose, onViewHost }: BookingDetailModalProps) {
    const { handleAction } = useAsyncAction()
    const { mutate: updateStatus } = useUpdateBookingStatus()

    if (!booking) return null

    const startTime = new Date(booking.startTime)
    const now = new Date()
    const tenMinutesAfterStart = new Date(startTime.getTime() + 10 * 60 * 1000)
    const canMarkNoShow = booking.status === 'CONFIRMED' && now >= tenMinutesAfterStart

    const handleStatusUpdate = async (status: BookingStatus, label: string) => {
        handleAction(
            ({ id, status: nextStatus }: { id: string; status: BookingStatus }) =>
                updateStatus({ id, status: nextStatus }),
            { id: booking.id, status },
            {
                title: `${label} Booking`,
                message: `Are you sure you want to ${label.toLowerCase()} the booking for ${booking.studentName}?`,
                actionName: label,
            }
        )
    }

    return (
        <Modal
            isOpen={!!booking}
            onClose={onClose}
            title={`Booking Details - ${booking.studentName}`}
            size="lg"
        >
            <Box sx={{ p: 1 }}>
                <BookingDetailsPanel booking={booking} onViewHost={onViewHost} />

                <Divider sx={{ my: 4 }} />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, alignItems: 'center' }}>
                    <Box sx={{ mr: 'auto', color: 'text.secondary', typography: 'caption', display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                        <Box sx={{ fontWeight: 600 }}>Booking ID: {booking.id.slice(0, 8).toUpperCase()}</Box>
                        <Box>
                            Created on {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(booking.createdAt))}
                        </Box>
                    </Box>

                    {booking.status === 'CONFIRMED' && (
                        <>
                            <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                startIcon={<XCircle size={16} />}
                                onClick={() => handleStatusUpdate('CANCELLED', 'Cancel')}
                                sx={{ fontWeight: 600, borderRadius: 2 }}
                            >
                                Cancel Booking
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                component="a"
                                href={`/reschedule/${booking.id}${booking.rescheduleToken ? `?token=${booking.rescheduleToken}` : ''}`}
                                target="_blank"
                                startIcon={<Calendar size={16} />}
                                sx={{
                                    fontWeight: 600,
                                    borderRadius: 2,
                                    borderColor: 'divider',
                                    color: 'text.secondary',
                                    '&:hover': {
                                        borderColor: 'primary.main',
                                        color: 'primary.main',
                                        bgcolor: 'primary.lighter'
                                    }
                                }}
                            >
                                Reschedule
                            </Button>
                        </>
                    )}

                    {canMarkNoShow && (
                        <Button
                            variant="contained"
                            color="warning"
                            size="small"
                            startIcon={<Clock size={16} />}
                            onClick={() => handleStatusUpdate('NO_SHOW', 'No Show')}
                            sx={{ fontWeight: 600, borderRadius: 2 }}
                        >
                            Mark as No Show
                        </Button>
                    )}

                    <Button
                        variant="contained"
                        onClick={onClose}
                        sx={{ fontWeight: 600, borderRadius: 2 }}
                    >
                        Close
                    </Button>
                </Box>
            </Box>
        </Modal>
    )
}
