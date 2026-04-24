import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Link from '@mui/material/Link'
import { ChevronRight, RefreshCw, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import type { Event, EventScheduleSlot } from '@/types'
import { ScheduleSlotList } from './ScheduleSlotList'

interface Props {
  event: Event
  group: {
    id: string
    isRecurring: boolean
    slots: EventScheduleSlot[]
    startTime: string
  }
  onBack: () => void
  onEditSlot: (slot: EventScheduleSlot) => void
  onRemoveSlot: (slotId: string, info: string) => void
  onViewAttendees: (slot: EventScheduleSlot) => void
  onLogSession: (slot: EventScheduleSlot) => void
}

export function ScheduleSeriesTrackerView({
  event,
  group,
  onBack,
  onEditSlot,
  onRemoveSlot,
  onViewAttendees,
  onLogSession,
}: Props) {
  const sortedSlots = [...group.slots].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs 
            separator={<ChevronRight size={14} />} 
            sx={{ mb: 1, '& .MuiBreadcrumbs-li': { display: 'flex', alignItems: 'center' } }}
        >
          <Link
            underline="hover"
            color="inherit"
            href="#"
            onClick={(e) => { e.preventDefault(); onBack(); }}
            sx={{ fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            Scheduled Sessions
          </Link>
          <Typography color="text.primary" sx={{ fontSize: '0.875rem', fontWeight: 700 }}>
            {group.isRecurring ? 'Series Tracker' : 'Session Tracker'}
          </Typography>
        </Breadcrumbs>
        
        <Stack direction="row" spacing={2} alignItems="center">
           <Box sx={{ 
              p: 1.5, 
              borderRadius: 1, 
              bgcolor: 'background.paper', 
              border: '1px solid', 
              borderColor: 'divider',
              color: 'primary.main'
           }}>
              {group.isRecurring ? <RefreshCw size={24} /> : <Calendar size={24} />}
           </Box>
           <Box>
              <Typography variant="h6" fontWeight={800}>
                {group.isRecurring ? 'Weekly Recurring Series' : 'Individual Session Detail'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {format(new Date(group.startTime), 'EEEE')}s at {format(new Date(group.startTime), 'h:mm a')} • {group.slots.length} occurrences
              </Typography>
           </Box>
        </Stack>
      </Box>

      <ScheduleSlotList
        slots={sortedSlots}
        event={event}
        onRemove={onRemoveSlot}
        onEdit={onEditSlot}
        onViewAttendees={onViewAttendees}
        onLogSession={onLogSession}
      />
    </Box>
  )
}
