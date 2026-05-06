import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Avatar from '@mui/material/Avatar'
import { Calendar, Clock, User, Users, Trash2, XCircle, Edit, ClipboardList } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { alpha, useTheme } from '@mui/material/styles'
import { Modal } from '@/components/shared/ui/Modal'
import { Badge } from '@/components/shared/ui/Badge'
import type { EventScheduleSlot, Event } from '@/types'

interface ScheduleSlotDetailModalProps {
  slot: EventScheduleSlot | null
  event: Event
  onClose: () => void
  onEdit: (slot: EventScheduleSlot) => void
  onRemove: (slotId: string, info: string) => void
  onViewAttendees: (slot: EventScheduleSlot) => void
  onLogSession: (slot: EventScheduleSlot) => void
  onCancel: (slot: EventScheduleSlot, info: string) => void
}

export function ScheduleSlotDetailModal({
  slot,
  event,
  onClose,
  onEdit,
  onRemove,
  onViewAttendees,
  onLogSession,
  onCancel,
}: ScheduleSlotDetailModalProps) {
  const theme = useTheme()

  if (!slot) return null

  const startTime = parseISO(slot.startTime)
  const endTime = parseISO(slot.endTime)
  const dateInfo = format(startTime, 'EEEE, MMMM d, yyyy')
  const timeInfo = `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`
  const coachName = slot.assignedCoach
    ? `${slot.assignedCoach.firstName} ${slot.assignedCoach.lastName}`
    : 'Unassigned'
  const bookingCount = slot._count?.bookings ?? 0

  const handleAction = (action: (s: EventScheduleSlot, info: string) => void) => {
    onClose()
    action(slot, `${format(startTime, 'MMM d')} at ${format(startTime, 'h:mm a')}`)
  }

  return (
    <Modal isOpen={!!slot} onClose={onClose} title="Session Details" size="md">
      <Box sx={{ p: 1 }}>
        <Stack spacing={3}>
          {/* Header Info */}
          <Box>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ fontWeight: 700, letterSpacing: 1.2 }}
            >
              {event.name}
            </Typography>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
                {dateInfo}
              </Typography>
              <Box>
                {slot.isCancelled ? (
                  <Badge label="Cancelled" color="red" />
                ) : !slot.isActive ? (
                  <Badge label="Inactive" color="gray" />
                ) : (
                  <Badge label="Active" color="green" />
                )}
              </Box>
            </Stack>
          </Box>

          <Divider />

          {/* Details Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: 'primary.main',
                    display: 'flex',
                  }}
                >
                  <Clock size={18} />
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ textTransform: 'uppercase' }}
                  >
                    Time Slot
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {timeInfo}
                  </Typography>
                </Box>
              </Stack>
            </Stack>

            <Stack spacing={1}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: alpha(theme.palette.success.main, 0.08),
                    color: 'success.main',
                    display: 'flex',
                  }}
                >
                  <Users size={18} />
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ textTransform: 'uppercase' }}
                  >
                    Occupancy
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {bookingCount} / {slot.capacity || event.maxParticipantCount || '∞'} Bookings
                  </Typography>
                </Box>
              </Stack>
            </Stack>

            <Stack spacing={1}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: alpha(theme.palette.secondary.main, 0.08),
                    color: 'secondary.main',
                    display: 'flex',
                  }}
                >
                  <User size={18} />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                      sx={{ textTransform: 'uppercase' }}
                    >
                      Assigned Coach
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {slot.assignedCoach && (
                        <Avatar
                          src={slot.assignedCoach.avatarUrl || undefined}
                          sx={{ width: 20, height: 20, fontSize: '0.65rem' }}
                        >
                          {slot.assignedCoach.firstName[0]}
                        </Avatar>
                      )}
                      <Typography variant="body2" fontWeight={700}>
                        {coachName}
                      </Typography>
                    </Stack>
                  </Box>
                </Box>
              </Stack>
            </Stack>

            <Stack spacing={1}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: alpha(theme.palette.warning.main, 0.08),
                    color: 'warning.main',
                    display: 'flex',
                  }}
                >
                  <Calendar size={18} />
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ textTransform: 'uppercase' }}
                  >
                    Series Info
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {slot.recurrenceGroupId ? 'Recurring Weekly' : 'One-time Session'}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Box>

          <Divider />

          {/* Quick Actions */}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={700}
              sx={{ textTransform: 'uppercase', mb: 2, display: 'block' }}
            >
              Quick Actions
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<Users size={16} />}
                onClick={() => handleAction(onViewAttendees)}
                sx={{
                  justifyContent: 'flex-start',
                  py: 1,
                  borderRadius: 1.5,
                  fontWeight: 600,
                  textTransform: 'none',
                }}
              >
                View Attendees
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<ClipboardList size={16} />}
                onClick={() => handleAction(onLogSession)}
                sx={{
                  justifyContent: 'flex-start',
                  py: 1,
                  borderRadius: 1.5,
                  fontWeight: 600,
                  textTransform: 'none',
                }}
              >
                Session Log
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<Edit size={16} />}
                onClick={() => handleAction(onEdit)}
                sx={{
                  justifyContent: 'flex-start',
                  py: 1,
                  borderRadius: 1.5,
                  fontWeight: 600,
                  textTransform: 'none',
                }}
              >
                Edit Slot
              </Button>
              {!slot.isCancelled && (
                <Button
                  variant="outlined"
                  fullWidth
                  color="error"
                  startIcon={<XCircle size={16} />}
                  onClick={() => handleAction(onCancel)}
                  sx={{
                    justifyContent: 'flex-start',
                    py: 1,
                    borderRadius: 1.5,
                    fontWeight: 600,
                    textTransform: 'none',
                  }}
                >
                  Cancel Session
                </Button>
              )}
            </Box>
          </Box>

          <Divider />

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Button
              size="small"
              color="error"
              startIcon={<Trash2 size={16} />}
              onClick={() => handleAction((s, info) => onRemove(s.id, info || ''))}
              sx={{ fontWeight: 600, textTransform: 'none' }}
            >
              Delete Permanently
            </Button>
            <Button
              variant="contained"
              onClick={onClose}
              sx={{ px: 4, fontWeight: 700, borderRadius: 2 }}
            >
              Close
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Modal>
  )
}
