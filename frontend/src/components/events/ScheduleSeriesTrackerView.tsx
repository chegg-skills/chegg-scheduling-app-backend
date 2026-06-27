import { useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import FormControl from '@mui/material/FormControl'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import { ChevronLeft } from 'lucide-react'
import type { Event, EventScheduleSlot } from '@/types'
import { ScheduleSlotList } from './ScheduleSlotList'
import { Button } from '@/components/shared/ui/Button'

interface Props {
  event: Event
  group: {
    id: string
    isRecurring: boolean
    slots: EventScheduleSlot[]
    startTime: string
    isContinuous?: boolean
    isStopped?: boolean
  }
  onBack: () => void
  onEditSlot: (slot: EventScheduleSlot) => void
  onRemoveSlot: (slotId: string, info: string) => void
  onViewAttendees: (slot: EventScheduleSlot) => void
  onLogSession: (slot: EventScheduleSlot) => void
  onCancelSlot: (slot: EventScheduleSlot, info: string) => void
  onStopSeries?: (group: any) => void
  onResumeSeries?: (group: any) => void
  canManage?: boolean
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
  onStopSeries,
  onResumeSeries,
  canManage = true,
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

  const handleTabChange = (newValue: TabValue) => {
    setActiveTab(newValue)
  }

  return (
    <Box>
      {/* Redesigned Single-Row Header toolbar */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 2,
          mb: 3,
          gap: 2,
        }}
      >
        {/* Left Side: Back button + Recurrence Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <IconButton
            onClick={onBack}
            size="small"
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5,
              bgcolor: 'background.paper',
              color: 'text.secondary',
              width: 32,
              height: 32,
              '&:hover': {
                bgcolor: 'action.hover',
                color: 'text.primary',
              },
            }}
            aria-label="Back to Scheduled Sessions"
          >
            <ChevronLeft size={16} />
          </IconButton>

          <Box
            sx={{
              width: '1px',
              height: 20,
              bgcolor: 'divider',
              display: { xs: 'none', sm: 'block' },
            }}
          />

          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {group.isRecurring ? 'Series Tracker' : 'Session Tracker'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {group.isRecurring ? 'Weekly Series' : 'One-time session'}
              {' • '}
              {new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date(group.startTime))}s at{' '}
              {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(group.startTime))}
              {' • '}
              {group.isContinuous ? 'Continuous' : `${group.slots.length} occurrences`}
            </Typography>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.25,
                borderRadius: 1,
                bgcolor: group.isStopped ? 'error.lighter' : 'success.lighter',
                color: group.isStopped ? 'error.main' : 'success.main',
                fontSize: '0.6875rem',
                fontWeight: 700,
              }}
            >
              <Box
                sx={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  bgcolor: group.isStopped ? 'error.main' : 'success.main',
                }}
              />
              {group.isStopped ? 'Stopped' : 'Active'}
            </Box>
          </Stack>
        </Box>

        {/* Right Side: Select Dropdown filter + Action button */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' }, justifyContent: { xs: 'space-between', md: 'flex-end' } }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select
              value={activeTab}
              onChange={(e) => handleTabChange(e.target.value as TabValue)}
              sx={{
                borderRadius: 1.5,
                fontSize: '0.8125rem',
                fontWeight: 600,
                bgcolor: 'background.paper',
                '& .MuiSelect-select': {
                  py: 1,
                  px: 1.5,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                },
              }}
            >
              <MenuItem value="upcoming" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                Upcoming ({counts.upcoming})
              </MenuItem>
              <MenuItem value="all" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                All Sessions ({counts.all})
              </MenuItem>
              <MenuItem value="past" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                Past ({counts.past})
              </MenuItem>
            </Select>
          </FormControl>

          {canManage && group.isContinuous && (
            <Box>
              {!group.isStopped && onStopSeries && (
                <Button variant="secondary" size="sm" onClick={() => onStopSeries(group)}>
                  Stop Recurrence
                </Button>
              )}
              {group.isStopped && onResumeSeries && (
                <Button variant="primary" size="sm" onClick={() => onResumeSeries(group)}>
                  Resume Recurrence
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Box>

      <ScheduleSlotList
        slots={filteredSlots}
        groupSlots={group.slots}
        event={event}
        onRemove={onRemoveSlot}
        onEdit={onEditSlot}
        onViewAttendees={onViewAttendees}
        onLogSession={onLogSession}
        onCancel={onCancelSlot}
        canManage={canManage}
      />
    </Box>
  )
}
