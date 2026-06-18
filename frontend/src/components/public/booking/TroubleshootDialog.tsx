import { useState, useEffect, useMemo } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import { useTheme } from '@mui/material/styles'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Globe,
  HelpCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useSlotDebugReport } from '@/hooks/queries/useSlotDebug'
import type { SlotDebugCoachStatus, SlotDebugEntry } from '@/types'

interface TroubleshootDialogProps {
  open: boolean
  onClose: () => void
  /** When true (signed-in internal user), shows the admin "Availability Debug" tab. */
  isAdminViewer?: boolean
  /** Event whose slots are diagnosed in the debug tab. */
  eventId?: string
  /** Student-selected timezone, used to format debug times and anchor the booking window. */
  selectedTimezone?: string
  /** Date the admin is currently viewing in the calendar (YYYY-MM-DD), used as the debug default. */
  currentDate?: string
}

function checkBrowserCompatibility(): boolean {
  try {
    return (
      typeof window.fetch === 'function' &&
      typeof window.Intl?.DateTimeFormat === 'function' &&
      typeof window.localStorage !== 'undefined'
    )
  } catch {
    return false
  }
}

function checkStorageAccess(): boolean {
  try {
    const key = '__cc_probe__'
    localStorage.setItem(key, '1')
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

interface DiagnosisItemProps {
  icon: LucideIcon
  label: string
  status: string
  color: string
}

function DiagnosisItem({ icon: Icon, label, status, color }: DiagnosisItemProps) {
  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 1 }}>
      <Icon size={20} color={color} />
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="body2" fontWeight={600}>
          {label}
        </Typography>
      </Box>
      <Typography
        variant="caption"
        color={color}
        sx={{ fontWeight: 700, textTransform: 'uppercase' }}
      >
        {status}
      </Typography>
    </Stack>
  )
}

type ChipColor = 'success' | 'error' | 'warning' | 'default'

/** Maps a debug status to a human label + chip colour, formatting any times in the viewer's timezone. */
function describeStatus(
  status: SlotDebugCoachStatus,
  fmtTime: (iso: string) => string
): { label: string; color: ChipColor } {
  switch (status.status) {
    case 'available':
      return { label: 'Available', color: 'success' }
    case 'conflict':
      return {
        label: `Conflict: ${status.conflictingEvent} (${fmtTime(status.conflictStart)}–${fmtTime(
          status.conflictEnd
        )})`,
        color: 'error',
      }
    case 'outside_availability':
      return {
        label: status.windows.length
          ? `Outside availability (set: ${status.windows.join(', ')})`
          : 'No availability set for this day',
        color: 'warning',
      }
    case 'exception_block':
      return { label: 'Blocked by an availability exception', color: 'warning' }
    case 'invalid_timezone':
      return { label: 'Coach has an invalid timezone setting', color: 'error' }
    case 'in_the_past':
      return { label: 'In the past', color: 'default' }
    case 'notice_window':
      return {
        label: `Minimum notice not met (${status.minimumNoticeMinutes} min required)`,
        color: 'warning',
      }
    case 'booking_window':
      return {
        label: `Beyond booking window (max ${status.maxBookingWindowDays} days)`,
        color: 'warning',
      }
    case 'recurrence_limit':
      return { label: 'Beyond the recurrence visibility limit', color: 'warning' }
    case 'capacity_full':
      return { label: 'Slot at full capacity', color: 'error' }
    default:
      return { label: 'Unavailable', color: 'default' }
  }
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

interface SlotDebugTabProps {
  eventId?: string
  selectedTimezone: string
  currentDate?: string
}

/** Admin-only diagnostic: lists every slot for a date and why it is / isn't visible to students. */
function SlotDebugTab({ eventId, selectedTimezone, currentDate }: SlotDebugTabProps) {
  const [date, setDate] = useState<string>(currentDate ?? toDateInputValue(new Date()))

  const { data, isLoading, isError } = useSlotDebugReport(eventId, date, selectedTimezone, true)

  const fmtTime = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: selectedTimezone || undefined,
    })
    return (iso: string) => formatter.format(new Date(iso))
  }, [selectedTimezone])

  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          Diagnose why slots are hidden on a given date. Visible to internal users only — students
          never see this tab.
        </Typography>
      </Box>

      <Box>
        <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
          Date
        </Typography>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid rgba(0,0,0,0.23)',
            fontSize: 14,
            fontFamily: 'inherit',
          }}
        />
      </Box>

      {isLoading && (
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 2 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Checking availability…
          </Typography>
        </Stack>
      )}

      {isError && (
        <Typography variant="body2" color="error">
          Could not load the availability report. Please try again.
        </Typography>
      )}

      {data && !isLoading && (
        <>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'grey.50' }}>
            <Typography variant="body2" fontWeight={800}>
              {data.visibleSlots} of {data.totalSlots} slots visible to students
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {data.eventName} · {data.bookingMode} · {data.assignmentStrategy}
            </Typography>
          </Paper>

          {data.coaches.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No coaches are assigned to this event — students will never see slots until a coach is
              added to the pool.
            </Typography>
          )}

          {data.slots.length === 0 && data.coaches.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {data.bookingMode === 'FIXED_SLOTS'
                ? 'No slots configured for this date.'
                : 'No coach has availability configured for this date — students see no slots.'}
            </Typography>
          )}

          <Stack spacing={1}>
            {data.slots.map((slot) => (
              <SlotDebugRow key={slot.startTime} slot={slot} fmtTime={fmtTime} />
            ))}
          </Stack>
        </>
      )}
    </Stack>
  )
}

function SlotDebugRow({
  slot,
  fmtTime,
}: {
  slot: SlotDebugEntry
  fmtTime: (iso: string) => string
}) {
  const timeLabel = `${fmtTime(slot.startTime)} – ${fmtTime(slot.endTime)}`

  return (
    <Accordion
      defaultExpanded={!slot.visible}
      disableGutters
      sx={{ '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
    >
      <AccordionSummary expandIcon={<ChevronDown size={18} />}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexGrow: 1 }}>
          <Typography variant="body2" fontWeight={700}>
            {timeLabel}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Chip
            size="small"
            color={slot.visible ? 'success' : 'error'}
            label={slot.visible ? 'Visible' : 'Hidden'}
            sx={{ fontWeight: 700 }}
          />
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        {slot.eventLevelStatus ? (
          <Box>
            <Chip
              size="small"
              color={describeStatus(slot.eventLevelStatus, fmtTime).color}
              label={describeStatus(slot.eventLevelStatus, fmtTime).label}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Event-level rule — applies to all coaches.
            </Typography>
          </Box>
        ) : slot.coaches.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No coach detail available.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {slot.coaches.map((c) => {
              const meta = describeStatus(c.status, fmtTime)
              return (
                <Stack
                  key={c.coachId}
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  flexWrap="wrap"
                  useFlexGap
                >
                  <Typography variant="body2" fontWeight={600}>
                    {c.coachName}
                  </Typography>
                  {c.decidesVisibility && (
                    <Typography variant="caption" color="text.secondary">
                      (decides visibility)
                    </Typography>
                  )}
                  <Box sx={{ flexGrow: 1 }} />
                  <Chip size="small" color={meta.color} label={meta.label} />
                </Stack>
              )
            })}
          </Stack>
        )}
      </AccordionDetails>
    </Accordion>
  )
}

export function TroubleshootDialog({
  open,
  onClose,
  isAdminViewer = false,
  eventId,
  selectedTimezone,
  currentDate,
}: TroubleshootDialogProps) {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const [online, setOnline] = useState(navigator.onLine)
  const [activeTab, setActiveTab] = useState(0)
  const browserCompatible = useMemo(() => checkBrowserCompatibility(), [])
  const storageAccessible = useMemo(() => checkStorageAccess(), [])

  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['public'] })
    onClose()
  }

  const tipsPanel = (
    <Stack spacing={3} sx={{ mt: 1 }}>
      {/* Section 1: System Health */}
      <Box>
        <Typography
          variant="overline"
          color="text.secondary"
          fontWeight={800}
          sx={{ mb: 1, display: 'block' }}
        >
          System Diagnosis
        </Typography>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <DiagnosisItem
            icon={online ? Wifi : WifiOff}
            label="Internet connection"
            status={online ? 'Online' : 'Offline'}
            color={online ? theme.palette.success.main : theme.palette.error.main}
          />
          <Divider sx={{ my: 0.5, borderStyle: 'dashed' }} />
          <DiagnosisItem
            icon={browserCompatible ? Globe : XCircle}
            label="Browser compatibility"
            status={browserCompatible ? 'Compatible' : 'Unsupported'}
            color={browserCompatible ? theme.palette.success.main : theme.palette.error.main}
          />
          <Divider sx={{ my: 0.5, borderStyle: 'dashed' }} />
          <DiagnosisItem
            icon={storageAccessible ? CheckCircle2 : XCircle}
            label="Session integrity"
            status={storageAccessible ? 'Healthy' : 'Blocked'}
            color={storageAccessible ? theme.palette.success.main : theme.palette.error.main}
          />
        </Paper>
      </Box>

      {/* Section 2: Quick Fixes */}
      <Box>
        <Typography
          variant="overline"
          color="text.secondary"
          fontWeight={800}
          sx={{ mb: 1, display: 'block' }}
        >
          Quick Fixes
        </Typography>
        <Stack spacing={1.5}>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <AlertCircle
              size={18}
              color={theme.palette.text.secondary}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <Typography variant="body2" color="text.secondary">
              <strong>No slots available?</strong> Coaches may be fully booked or you might be
              outside the allowed booking window.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <AlertCircle
              size={18}
              color={theme.palette.text.secondary}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <Typography variant="body2" color="text.secondary">
              <strong>Page unresponsive?</strong> Use the "Reload Booking Data" button below to
              refresh session data.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <AlertCircle
              size={18}
              color={theme.palette.text.secondary}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <Typography variant="body2" color="text.secondary">
              <strong>Wrong time shown?</strong> Slots are displayed in your browser's local
              timezone ({localTimezone}).
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <AlertCircle
              size={18}
              color={theme.palette.text.secondary}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <Typography variant="body2" color="text.secondary">
              <strong>Already booked?</strong> Check your email for a confirmation — you may have
              already secured a slot.
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Stack>
  )

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={isAdminViewer ? 'sm' : 'xs'}
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, p: 1 },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <HelpCircle size={24} color={theme.palette.primary.main} />
        <Typography variant="h6" fontWeight={800}>
          Troubleshooting
        </Typography>
      </DialogTitle>

      <DialogContent>
        {isAdminViewer ? (
          <>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="Tips" sx={{ textTransform: 'none', fontWeight: 700 }} />
              <Tab label="Availability Debug" sx={{ textTransform: 'none', fontWeight: 700 }} />
            </Tabs>
            {activeTab === 0 ? (
              tipsPanel
            ) : (
              <SlotDebugTab
                eventId={eventId}
                selectedTimezone={selectedTimezone ?? localTimezone}
                currentDate={currentDate}
              />
            )}
          </>
        ) : (
          tipsPanel
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button
          onClick={onClose}
          variant="text"
          sx={{ fontWeight: 700, textTransform: 'none', color: 'text.secondary' }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleRefresh}
          variant="contained"
          startIcon={<RefreshCw size={18} />}
          sx={{
            fontWeight: 800,
            textTransform: 'none',
            borderRadius: 2,
            px: 3,
            bgcolor: 'primary.main',
            '&:hover': { bgcolor: 'primary.dark' },
          }}
        >
          Reload Booking Data
        </Button>
      </DialogActions>
    </Dialog>
  )
}
