import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import { Lock, ChevronDown, ChevronUp } from 'lucide-react'
import { alpha } from '@mui/material/styles'

export function ConsentNotice() {
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('storage_notice_dismissed')
      if (dismissed !== 'true') {
        setVisible(true)
      }
    } catch (e) {
      // In private browsing mode where localStorage is restricted,
      // fallback to showing the notice every visit.
      setVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    try {
      localStorage.setItem('storage_notice_dismissed', 'true')
    } catch (e) {
      // Ignore storage write failures in private browsing
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <Paper
      elevation={4}
      sx={{
        position: 'fixed',
        bottom: { xs: 16, sm: 24 },
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: 640,
        zIndex: 2000,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(58, 44, 65, 0.12)',
        p: 2.5,
      }}
    >
      <Stack spacing={2}>
        {/* Main Banner Row */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ flex: 1 }}>
            <Box
              sx={{
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                mt: 0.25,
              }}
            >
              <Lock size={16} />
            </Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, lineHeight: 1.5, color: 'text.primary' }}
            >
              We use essential browser storage for security and to enable booking features. No
              tracking or ads.
            </Typography>
          </Stack>

          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: 'flex-end' }}
          >
            <Button
              size="small"
              variant="text"
              onClick={() => setExpanded(!expanded)}
              endIcon={expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                color: 'text.secondary',
                fontSize: '0.8125rem',
                p: 0.5,
                minWidth: 'auto',
                '&:hover': {
                  color: 'primary.main',
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                },
              }}
            >
              Learn more
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleDismiss}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.8125rem',
                borderRadius: 1,
                px: 2,
                py: 0.75,
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              }}
            >
              Got it
            </Button>
          </Stack>
        </Stack>

        {/* Collapsible Detailed Info */}
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box sx={{ pt: 1.5 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'text.secondary',
                mb: 1.5,
              }}
            >
              What we store & why
            </Typography>
            <Stack spacing={1.5}>
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, fontSize: '0.8125rem', color: 'text.primary' }}
                >
                  CSRF Security Token (<code>csrf_token</code> in localStorage)
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.25, lineHeight: 1.4 }}
                >
                  Protects form submissions from cross-site request forgery attacks to ensure
                  booking data cannot be hijacked.
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, fontSize: '0.8125rem', color: 'text.primary' }}
                >
                  Authorization Tokens (<code>reschedule_token_*</code> &{' '}
                  <code>cancel_token_*</code> in sessionStorage)
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.25, lineHeight: 1.4 }}
                >
                  Short-lived security credentials passed from email links to authorize rescheduling
                  or cancellation requests securely without requiring an account. These are
                  automatically cleared when you close your browser tab.
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, fontSize: '0.8125rem', color: 'text.primary' }}
                >
                  Troubleshooting Probe (<code>__cc_probe__</code> in localStorage)
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.25, lineHeight: 1.4 }}
                >
                  A temporary check used during connection diagnostic tests to verify your browser
                  accepts standard local storage keys. It is immediately deleted.
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, fontSize: '0.8125rem', color: 'text.primary' }}
                >
                  Remembered Contact Details (<code>chegg_student_info</code> in localStorage)
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.25, lineHeight: 1.4 }}
                >
                  Stores your name and email address after a successful booking to auto-fill the
                  form for your convenience during future scheduling requests. This is stored
                  strictly locally on your browser.
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Collapse>
      </Stack>
    </Paper>
  )
}
