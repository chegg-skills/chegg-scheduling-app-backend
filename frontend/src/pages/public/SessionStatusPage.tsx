import * as React from 'react'
import { useSearchParams, useOutletContext } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, XCircle, HelpCircle, CheckCircle } from 'lucide-react'
import type { PublicLayoutOutletContext } from '@/components/layout/PublicLayout'
import LogoOrange from '@/assets/Color=Orange.svg'
import { PublicBaseLayout } from '@/components/public/layout/PublicBaseLayout'
import { PublicMainContent } from '@/components/public/layout/PublicMainContent'

type SessionState = 'invalid' | 'booking_cancelled' | 'slot_cancelled' | 'session_ended' | 'no_url'

export function SessionStatusPage() {
  const [searchParams] = useSearchParams()
  const { setFramed } = useOutletContext<PublicLayoutOutletContext>()

  React.useEffect(() => {
    setFramed(true)
  }, [setFramed])

  const rawState = searchParams.get('state')
  const state: SessionState =
    rawState === 'booking_cancelled' ||
    rawState === 'slot_cancelled' ||
    rawState === 'session_ended' ||
    rawState === 'no_url'
      ? rawState
      : 'invalid'

  const renderContent = () => {
    if (state === 'booking_cancelled' || state === 'slot_cancelled') {
      const isBooking = state === 'booking_cancelled'
      return (
        <StatusBlock
          icon={<XCircle size={32} />}
          iconColor="error.main"
          iconBg="error.light"
          title={isBooking ? 'Booking Cancelled' : 'Session Cancelled'}
          message={
            isBooking
              ? 'Your booking for this session has been cancelled.'
              : 'This session slot has been cancelled by the team.'
          }
        />
      )
    }

    if (state === 'session_ended') {
      return (
        <StatusBlock
          icon={<CheckCircle size={32} />}
          iconColor="success.main"
          iconBg="success.light"
          title="Session Completed"
          message="This session has already taken place. Please check your email for a follow-up or contact your coordinator."
        />
      )
    }

    if (state === 'no_url') {
      return (
        <StatusBlock
          icon={<HelpCircle size={32} />}
          iconColor="warning.main"
          iconBg="warning.light"
          title="No Joining URL Configured"
          message="No joining URL is configured for this session. Please contact your coordinator."
        />
      )
    }

    // invalid or unrecognized state
    return (
      <StatusBlock
        icon={<AlertCircle size={32} />}
        iconColor="error.main"
        iconBg="error.light"
        title="Invalid Session Link"
        message="This link is missing required authorization parameters or has expired. Please use the secure link from your confirmation email."
      />
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

          <Box sx={{ p: { xs: 4, sm: 5 } }}>
            <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
          </Box>
        </Box>
      </PublicMainContent>
    </PublicBaseLayout>
  )
}

function StatusBlock({
  icon,
  iconColor,
  iconBg,
  title,
  message,
}: {
  icon: React.ReactNode
  iconColor: string
  iconBg: string
  title: string
  message: string
}) {
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      sx={{ textAlign: 'center', py: 2 }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          bgcolor: iconBg,
          color: iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 1,
        }}
      >
        {icon}
      </Box>
      <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mt: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  )
}
