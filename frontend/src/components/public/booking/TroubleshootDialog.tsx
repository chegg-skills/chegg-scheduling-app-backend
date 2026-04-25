import { useState, useEffect, useMemo } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import { AlertCircle, CheckCircle2, Globe, HelpCircle, RefreshCw, Wifi, WifiOff, XCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

interface TroubleshootDialogProps {
  open: boolean
  onClose: () => void
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
        <Typography variant="body2" fontWeight={600}>{label}</Typography>
      </Box>
      <Typography variant="caption" color={color} sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
        {status}
      </Typography>
    </Stack>
  )
}

export function TroubleshootDialog({ open, onClose }: TroubleshootDialogProps) {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const [online, setOnline] = useState(navigator.onLine)
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, p: 1 }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <HelpCircle size={24} color={theme.palette.primary.main} />
        <Typography variant="h6" fontWeight={800}>Troubleshooting</Typography>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Section 1: System Health */}
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={800} sx={{ mb: 1, display: 'block' }}>
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
            <Typography variant="overline" color="text.secondary" fontWeight={800} sx={{ mb: 1, display: 'block' }}>
              Quick Fixes
            </Typography>
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <AlertCircle size={18} color={theme.palette.text.secondary} style={{ marginTop: 2, flexShrink: 0 }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>No slots available?</strong> Coaches may be fully booked or you might be outside the allowed booking window.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <AlertCircle size={18} color={theme.palette.text.secondary} style={{ marginTop: 2, flexShrink: 0 }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>Page unresponsive?</strong> Use the "Reload Booking Data" button below to refresh session data.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <AlertCircle size={18} color={theme.palette.text.secondary} style={{ marginTop: 2, flexShrink: 0 }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>Wrong time shown?</strong> Slots are displayed in your browser's local timezone ({localTimezone}).
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <AlertCircle size={18} color={theme.palette.text.secondary} style={{ marginTop: 2, flexShrink: 0 }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>Already booked?</strong> Check your email for a confirmation — you may have already secured a slot.
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Stack>
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
            '&:hover': { bgcolor: 'primary.dark' }
          }}
        >
          Reload Booking Data
        </Button>
      </DialogActions>
    </Dialog>
  )
}
