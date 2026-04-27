import { useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Link from '@mui/material/Link'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
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
  onCancelSlot: (slot: EventScheduleSlot, info: string) => void
}

type TabValue = 'all' | 'upcoming' | 'past'

export function ScheduleSeriesTrackerView({
  event,
  group,
  onBack,
  onEditSlot,
  onRemoveSlot,
  onViewAttendees,
  onLogSession,
  onCancelSlot,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabValue>('upcoming')

  const filteredSlots = useMemo(() => {
    const now = new Date()
    const sorted = [...group.slots].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )

    if (activeTab === 'all') return sorted
    if (activeTab === 'upcoming') {
      return sorted.filter((s) => new Date(s.endTime) >= now)
    }
    return sorted.filter((s) => new Date(s.endTime) < now)
  }, [group.slots, activeTab])

  const counts = useMemo(() => {
    const now = new Date()
    return {
      all: group.slots.length,
      upcoming: group.slots.filter((s) => new Date(s.endTime) >= now).length,
      past: group.slots.filter((s) => new Date(s.endTime) < now).length,
    }
  }, [group.slots])

  const handleTabChange = (_: React.SyntheticEvent, newValue: TabValue) => {
    setActiveTab(newValue)
  }

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
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {group.isRecurring ? 'Weekly Recurring Series' : 'Individual Session Detail'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {format(new Date(group.startTime), 'EEEE')}s at {format(new Date(group.startTime), 'h:mm a')} • {group.slots.length} occurrences
              </Typography>
           </Box>
        </Stack>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              minWidth: 100,
            }
          }}
        >
          <Tab label={`Upcoming (${counts.upcoming})`} value="upcoming" />
          <Tab label={`All Sessions (${counts.all})`} value="all" />
          <Tab label={`Past (${counts.past})`} value="past" />
        </Tabs>
      </Box>

      <ScheduleSlotList
        slots={filteredSlots}
        event={event}
        onRemove={onRemoveSlot}
        onEdit={onEditSlot}
        onViewAttendees={onViewAttendees}
        onLogSession={onLogSession}
        onCancel={onCancelSlot}
      />
    </Box>
  )
}
