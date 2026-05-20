import React, { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'
import { AlertTriangle, X } from 'lucide-react'
import type { Booking } from '@/types'
import { toTitleCase } from '@/utils/toTitleCase'

interface CancelBookingDialogProps {
  isOpen: boolean
  booking: Booking | null
  onClose: () => void
  onConfirm: (reason: string) => void
  isLoading?: boolean
}

const PREDEFINED_REASONS = [
  'Coach scheduling conflict / personal reason',
  'Student requested cancellation',
  'Student-side network / connectivity issue',
  'Student-side hardware / technical issue',
  'Double booking / technical error',
  'Other (Please specify)',
]

export function CancelBookingDialog({
  isOpen,
  booking,
  onClose,
  onConfirm,
  isLoading = false,
}: CancelBookingDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>('')
  const [customReason, setCustomReason] = useState<string>('')
  const [error, setError] = useState<string>('')

  if (!booking) return null

  const handleReasonChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedReason(event.target.value)
    setError('')
  }

  const handleCustomReasonChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCustomReason(event.target.value)
    if (event.target.value.trim()) {
      setError('')
    }
  }

  const handleSubmit = () => {
    if (!selectedReason) {
      setError('Please select a cancellation reason.')
      return
    }

    if (selectedReason === 'Other (Please specify)' && !customReason.trim()) {
      setError('Please specify the custom cancellation reason.')
      return
    }

    const finalReason =
      selectedReason === 'Other (Please specify)'
        ? customReason.trim()
        : selectedReason

    onConfirm(finalReason)
  }

  const handleClose = () => {
    if (isLoading) return
    setSelectedReason('')
    setCustomReason('')
    setError('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 2 }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'warning.light',
              color: 'warning.main',
              borderRadius: '50%',
              width: 36,
              height: 36,
            }}
          >
            <AlertTriangle size={20} />
          </Box>
          <Typography variant="h6" fontWeight="bold">
            Cancel Booking
          </Typography>
        </Stack>
        <IconButton onClick={handleClose} aria-label="Close" size="small" disabled={isLoading}>
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ py: 3 }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Are you sure you want to cancel the booking for <strong>{toTitleCase(booking.studentName)}</strong>?
          This action will release the slot and notify all participants via email.
        </Typography>

        <FormControl component="fieldset" fullWidth error={!!error && !selectedReason}>
          <FormLabel
            component="legend"
            sx={{ fontWeight: 'bold', color: 'text.primary', mb: 1.5 }}
          >
            Why is this booking being cancelled?
          </FormLabel>
          <RadioGroup
            aria-label="cancellation-reason"
            name="cancellationReason"
            value={selectedReason}
            onChange={handleReasonChange}
          >
            <Stack spacing={1}>
              {PREDEFINED_REASONS.map((reason) => (
                <FormControlLabel
                  key={reason}
                  value={reason}
                  control={<Radio size="small" />}
                  label={<Typography variant="body2">{reason}</Typography>}
                  sx={{
                    margin: 0,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: selectedReason === reason ? 'primary.main' : 'divider',
                    backgroundColor: selectedReason === reason ? 'action.hover' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                    transition: 'all 0.2s ease',
                  }}
                />
              ))}
            </Stack>
          </RadioGroup>
        </FormControl>

        {selectedReason === 'Other (Please specify)' && (
          <Box sx={{ mt: 2.5 }}>
            <TextField
              label="Specify Custom Reason"
              multiline
              rows={3}
              fullWidth
              variant="outlined"
              placeholder="Please provide details about the cancellation..."
              value={customReason}
              onChange={handleCustomReasonChange}
              error={!!error && selectedReason === 'Other (Please specify)' && !customReason.trim()}
              helperText={
                error && selectedReason === 'Other (Please specify)' && !customReason.trim()
                  ? error
                  : 'Details will be included in the notification emails.'
              }
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
          </Box>
        )}

        {error && !selectedReason && (
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            {error}
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            onClick={handleClose}
            size="small"
            disabled={isLoading}
            sx={{ borderRadius: 1.5, height: 40, px: 2.5, fontSize: '0.875rem' }}
          >
            No, Keep Booking
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleSubmit}
            size="small"
            disabled={isLoading || !selectedReason}
            sx={{ borderRadius: 1.5, height: 40, px: 2.5, fontSize: '0.875rem' }}
          >
            {isLoading ? 'Cancelling...' : 'Confirm Cancellation'}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  )
}
