import * as React from 'react'
import { useParams, useSearchParams, useNavigate, useOutletContext } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Avatar from '@mui/material/Avatar'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import { useTheme } from '@mui/material/styles'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Clock,
  Copy,
  Video,
  AlertCircle,
  XCircle,
  HelpCircle,
  CheckCircle
} from 'lucide-react'
import { useSlotJoinInfo } from './hooks/useSlotJoinInfo'
import type { PublicLayoutOutletContext } from '@/components/layout/PublicLayout'
import LogoOrange from '@/assets/Color=Orange.svg'
import { PublicBaseLayout } from '@/components/public/layout/PublicBaseLayout'
import { PublicMainContent } from '@/components/public/layout/PublicMainContent'

interface SessionDetails {
  eventName: string
  eventDescription: string | null
  startTime: string
  endTime: string
  durationSeconds: number
  teamName: string | null
  timezone: string
  coachName: string | null
  coachAvatarUrl: string | null
}

const CLOCK_SKEW_RETRIES = 5
const CLOCK_SKEW_INTERVAL_MS = 5000

function getRemainingTime(diffMs: number) {
  if (diffMs <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }
  const totalSeconds = Math.ceil(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { days, hours, minutes, seconds, total: totalSeconds }
}

function getInitials(name: string | null) {
  if (!name) return ''
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatSessionDate(dateStr: string | Date, timeZone: string) {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatSessionTime(startDateStr: string | Date, endDateStr: string | Date, timeZone: string) {
  const start = new Date(startDateStr)
  const end = new Date(endDateStr)
  
  const startStr = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(start)

  const endStr = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(end)

  return `${startStr} - ${endStr}`
}

export function SessionLandingPage() {
  const { slotId } = useParams<{ slotId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const theme = useTheme()
  const { setFramed } = useOutletContext<PublicLayoutOutletContext>()

  React.useEffect(() => {
    setFramed(true)
  }, [setFramed])

  // Strip token from URL immediately; persist in sessionStorage so refresh within the same tab works.
  // sessionStorage is tab-scoped and cleared on tab close — token never re-appears in the URL.
  const [token] = React.useState(() => {
    const fromUrl = searchParams.get('t')
    if (fromUrl) {
      sessionStorage.setItem(`session-token-${slotId}`, fromUrl)
      return fromUrl
    }
    return sessionStorage.getItem(`session-token-${slotId}`) ?? ''
  })
  React.useEffect(() => {
    if (searchParams.has('t')) {
      navigate(window.location.pathname, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isError, refetch } = useSlotJoinInfo(slotId ?? '', token) as {
    data: {
      status: 'available' | 'pending' | 'booking_cancelled' | 'slot_cancelled' | 'session_ended'
      joinUrl?: string | null
      startsAt?: string
      minutesUntilAvailable?: number
      sessionDetails?: SessionDetails | null
    } | null
    isLoading: boolean
    isError: boolean
    refetch: () => void
  }

  const [copied, setCopied] = React.useState(false)
  const retryCountRef = React.useRef(0)
  const revealTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const skewTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-refresh when countdown ends
  React.useEffect(() => {
    if (data?.status !== 'pending' || !data.startsAt) return

    const startsAt = new Date(data.startsAt).getTime()
    const revealAt = startsAt - 15 * 60 * 1000
    const delayMs = revealAt - Date.now()

    if (delayMs > 0) {
      revealTimerRef.current = setTimeout(() => {
        retryCountRef.current = 1
        refetch()
      }, delayMs)
    } else {
      // Already within window — refetch immediately; clock-skew retries start from 1
      retryCountRef.current = 1
      refetch()
    }

    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current)
    }
  }, [data?.status === 'pending' ? data?.startsAt : null]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clock-skew retry
  React.useEffect(() => {
    if (data?.status !== 'pending') {
      if (skewTimerRef.current) clearInterval(skewTimerRef.current)
      return
    }
    if (retryCountRef.current > 0 && retryCountRef.current <= CLOCK_SKEW_RETRIES) {
      skewTimerRef.current = setInterval(() => {
        retryCountRef.current += 1
        if (retryCountRef.current > CLOCK_SKEW_RETRIES) {
          clearInterval(skewTimerRef.current!)
          return
        }
        refetch()
      }, CLOCK_SKEW_INTERVAL_MS)
    }
    return () => {
      if (skewTimerRef.current) clearInterval(skewTimerRef.current)
    }
  }, [data?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const timezone = React.useMemo(() => {
    if (data?.sessionDetails?.timezone) {
      return data.sessionDetails.timezone
    }
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return 'UTC'
    }
  }, [data?.sessionDetails?.timezone])

  const rawJoinUrl = data?.joinUrl
  const joinUrl = React.useMemo(() => {
    if (!rawJoinUrl) return null
    try {
      const u = new URL(rawJoinUrl)
      return u.protocol === 'https:' || u.protocol === 'http:' ? rawJoinUrl : null
    } catch {
      return null
    }
  }, [rawJoinUrl])

  const renderContent = () => {
    if (!token) {
      return (
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          sx={{ textAlign: 'center', py: 2 }}
        >
          <IconWrapper color="error.main" bg="error.light">
            <XCircle size={32} />
          </IconWrapper>
          <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mt: 1 }}>
            Invalid Session Link
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            This link is missing required authorization parameters.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Please use the secure link from your confirmation email.
          </Typography>
        </Box>
      )
    }

    if (isLoading) {
      return (
        <Box
          component={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}
        >
          <CircularProgress size={44} thickness={4} sx={{ color: 'primary.main', mb: 2 }} />
          <Typography variant="body2" fontWeight={600} color="text.secondary">
            Loading session details...
          </Typography>
        </Box>
      )
    }

    if (isError || !data) {
      return (
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          sx={{ textAlign: 'center', py: 2 }}
        >
          <IconWrapper color="error.main" bg="error.light">
            <AlertCircle size={32} />
          </IconWrapper>
          <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mt: 1 }}>
            Link Expired or Invalid
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            We couldn't retrieve this session. The link may have expired or is incorrect.
          </Typography>
          <Button variant="outlined" color="primary" sx={{ borderRadius: 1.5 }} onClick={() => refetch()} size="small">
            Retry Connection
          </Button>
        </Box>
      )
    }

    const { sessionDetails } = data

    // Format Session Time in Booking Timezone
    const formattedDate = sessionDetails
      ? formatSessionDate(sessionDetails.startTime, timezone)
      : ''
    const formattedTime = sessionDetails
      ? formatSessionTime(sessionDetails.startTime, sessionDetails.endTime, timezone)
      : ''

    if (data.status === 'booking_cancelled' || data.status === 'slot_cancelled') {
      const isBooking = data.status === 'booking_cancelled'
      return (
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          sx={{ textAlign: 'center', py: 2 }}
        >
          <IconWrapper color="error.main" bg="error.light">
            <XCircle size={32} />
          </IconWrapper>
          <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mt: 1 }}>
            {isBooking ? 'Booking Cancelled' : 'Session Cancelled'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {isBooking 
              ? 'Your booking for this session has been cancelled.' 
              : 'This session slot has been cancelled by the team.'}
          </Typography>

          {sessionDetails && (
            <Stack spacing={1} sx={{ mt: 1, width: '100%', alignItems: 'center' }}>
              {sessionDetails.teamName && (
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {sessionDetails.teamName}
                </Typography>
              )}
              <Typography variant="body1" fontWeight={700}>
                {sessionDetails.eventName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formattedDate} • {formattedTime}
              </Typography>
            </Stack>
          )}
        </Box>
      )
    }

    if (data.status === 'session_ended') {
      return (
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          sx={{ textAlign: 'center', py: 2 }}
        >
          <IconWrapper color="success.main" bg="success.light">
            <CheckCircle size={32} />
          </IconWrapper>
          <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mt: 1 }}>
            Session Completed
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This session has already taken place. Please check your email for a follow-up or contact your coordinator.
          </Typography>
          {sessionDetails && (
            <Stack spacing={1} sx={{ mt: 1, width: '100%', alignItems: 'center' }}>
              {sessionDetails.teamName && (
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}
                >
                  {sessionDetails.teamName}
                </Typography>
              )}
              <Typography variant="body1" fontWeight={700}>
                {sessionDetails.eventName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formattedDate} • {formattedTime}
              </Typography>
            </Stack>
          )}
        </Box>
      )
    }

    const isAvailable = data.status === 'available'
    const statusLabel = isAvailable ? 'Ready to Join' : 'Upcoming Session'

    return (
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        {/* Info Row (Team Name & Status) */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%', mb: 2 }}>
          <Typography 
            variant="caption" 
            sx={{ 
              fontWeight: 800, 
              textTransform: 'uppercase', 
              letterSpacing: '0.08em', 
              color: 'text.secondary' 
            }}
          >
            {sessionDetails?.teamName || 'Session'}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              fontWeight: 800, 
              textTransform: 'uppercase', 
              letterSpacing: '0.08em', 
              color: 'primary.main'
            }}
          >
            {statusLabel}
          </Typography>
        </Stack>

        <Divider sx={{ width: '100%', mb: 2.5 }} />

        {/* Session Title */}
        <Typography variant="h5" fontWeight={850} sx={{ mb: 1.5, lineHeight: 1.3, color: 'text.primary', textAlign: 'left' }}>
          {sessionDetails?.eventName || 'Your Session'}
        </Typography>

        {/* Host Details */}
        {sessionDetails?.coachName && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
            <Avatar
              src={sessionDetails.coachAvatarUrl || undefined}
              sx={{ 
                width: 24, 
                height: 24, 
                bgcolor: 'primary.light', 
                color: 'primary.main', 
                fontSize: '0.7rem', 
                fontWeight: 700 
              }}
            >
              {getInitials(sessionDetails.coachName)}
            </Avatar>
            <Typography variant="body2" color="text.secondary">
              Hosted by <strong>{sessionDetails.coachName}</strong>
            </Typography>
          </Stack>
        )}

        {/* Date and Time Info */}
        {sessionDetails && (
          <Stack spacing={2} alignItems="flex-start" sx={{ mb: 4 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ color: 'text.primary' }}>
              <Calendar size={18} style={{ color: theme.palette.primary.main }} />
              <Typography variant="body2" fontWeight={700}>
                {formattedDate}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ color: 'text.secondary' }}>
              <Clock size={16} style={{ color: theme.palette.primary.main }} />
              <Typography variant="body2">
                {formattedTime} ({timezone.replace(/_/g, ' ')})
              </Typography>
            </Stack>
          </Stack>
        )}

        <Divider sx={{ width: '100%', mb: 3.5 }} />

        {/* Context Content (Button or Countdown) */}
        {!isAvailable && data.startsAt ? (
          <Box sx={{ width: '100%' }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, mb: 1.5 }}>
              Joining link activates in:
            </Typography>

            <VisualCountdown 
              revealAt={new Date(data.startsAt).getTime() - 15 * 60 * 1000} 
              onComplete={() => refetch()} 
            />

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5, px: 2 }}>
              The join link will automatically reveal 15 minutes before the session starts. You don't need to refresh this page.
            </Typography>
          </Box>
        ) : joinUrl ? (
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ width: '100%', mt: 1 }}>
            <Tooltip title={copied ? 'Copied!' : 'Copy raw link'} placement="bottom">
              <Button
                variant="outlined"
                size="medium"
                startIcon={<Copy size={14} />}
                onClick={() => handleCopy(joinUrl)}
                sx={{ 
                  py: 1, 
                  px: 2.5, 
                  borderRadius: 1.5, 
                  borderColor: 'divider', 
                  color: 'text.secondary',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#D46200', 
                    color: '#D46200', 
                    bgcolor: 'rgba(232, 113, 0, 0.04)',
                  }
                }}
              >
                {copied ? 'Copied' : 'Copy Link'}
              </Button>
            </Tooltip>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                variant="contained"
                size="medium"
                href={joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<Video size={16} />}
                sx={{
                  py: 1,
                  px: 3,
                  borderRadius: 1.5,
                  fontWeight: 700,
                  bgcolor: 'primary.main', 
                  boxShadow: 'none',
                  textTransform: 'none',
                  '&:hover': {
                    bgcolor: '#D46200', 
                    boxShadow: 'none',
                  }
                }}
              >
                Join Session
              </Button>
            </motion.div>
          </Stack>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'warning.main', p: 1.5, borderRadius: 1.5, bgcolor: 'warning.light', border: '1px solid', borderColor: 'warning.main', opacity: 0.85, width: '100%', boxSizing: 'border-box' }}>
            <HelpCircle size={18} />
            <Typography variant="body2" fontWeight={600} textAlign="left">
              No joining URL is configured. Please contact your coordinator.
            </Typography>
          </Box>
        )}
      </Box>
    )
  }

  return (
    <PublicBaseLayout>
      <PublicMainContent>
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'stretch',
            minHeight: '380px',
          }}
        >
          {/* Card Header (flat solid peach header, tall profile) */}
          <Box
            sx={{
              bgcolor: 'primary.light', 
              py: 4, 
              px: { xs: 3, sm: 5 },
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              borderBottom: '1px solid',
              borderColor: 'divider',
              minHeight: 100, 
            }}
          >
            <img
              src={LogoOrange}
              alt="Chegg Skills"
              style={{
                height: 28, 
                width: 'auto',
                display: 'block',
              }}
            />
          </Box>

          {/* Card Body */}
          <Box sx={{ p: { xs: 4, sm: 5 } }}>
            <AnimatePresence mode="wait">
              {renderContent()}
            </AnimatePresence>
          </Box>
        </Box>
      </PublicMainContent>
    </PublicBaseLayout>
  )
}

function IconWrapper({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <Box
      sx={{
        width: 64,
        height: 64,
        borderRadius: '50%',
        bgcolor: bg,
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mx: 'auto',
        mb: 1,
      }}
    >
      {children}
    </Box>
  )
}

function VisualCountdown({ revealAt, onComplete }: { revealAt: number; onComplete: () => void }) {
  const [timeLeft, setTimeLeft] = React.useState<{ days: number; hours: number; minutes: number; seconds: number; total: number }>(() => {
    const remaining = revealAt - Date.now()
    return getRemainingTime(remaining)
  })

  React.useEffect(() => {
    const interval = setInterval(() => {
      const remaining = revealAt - Date.now()
      if (remaining <= 0) {
        clearInterval(interval)
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 })
        onComplete()
      } else {
        setTimeLeft(getRemainingTime(remaining))
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [revealAt, onComplete])

  if (timeLeft.total <= 0) {
    return (
      <Typography variant="body1" fontWeight={600} color="primary.main" sx={{ my: 3 }}>
        Activating session join link...
      </Typography>
    )
  }

  return (
    <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" sx={{ my: 3 }}>
      {timeLeft.days > 0 && (
        <>
          <DigitBlock value={timeLeft.days} label="Days" />
          <Typography variant="h4" color="text.secondary" sx={{ fontWeight: 800, mb: 2, fontFamily: '"Outfit", sans-serif' }}>:</Typography>
        </>
      )}
      <DigitBlock value={timeLeft.hours} label="Hours" />
      <Typography variant="h4" color="text.secondary" sx={{ fontWeight: 800, mb: 2, fontFamily: '"Outfit", sans-serif' }}>:</Typography>
      <DigitBlock value={timeLeft.minutes} label="Mins" />
      <Typography variant="h4" color="text.secondary" sx={{ fontWeight: 800, mb: 2, fontFamily: '"Outfit", sans-serif' }}>:</Typography>
      <DigitBlock value={timeLeft.seconds} label="Secs" />
    </Stack>
  )
}

function DigitBlock({ value, label }: { value: number; label: string }) {
  const formattedValue = value.toString().padStart(2, '0')
  return (
    <Stack alignItems="center" spacing={0.5} sx={{ minWidth: 64 }}>
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `rgba(232, 113, 0, 0.05)`, 
          borderRadius: 1.5, // 12px border radius
          border: '1px solid',
          borderColor: 'rgba(232, 113, 0, 0.15)',
        }}
      >
        <Typography
          variant="h3"
          sx={{
            fontFamily: '"Outfit", sans-serif',
            fontWeight: 800,
            color: 'primary.main', 
            letterSpacing: '-0.02em',
            fontSize: '2rem'
          }}
        >
          {formattedValue}
        </Typography>
      </Paper>
      <Typography 
        variant="caption" 
        sx={{ 
          textTransform: 'uppercase', 
          fontSize: '0.6rem', 
          fontWeight: 700, 
          letterSpacing: '0.08em', 
          color: 'text.secondary' 
        }}
      >
        {label}
      </Typography>
    </Stack>
  )
}
