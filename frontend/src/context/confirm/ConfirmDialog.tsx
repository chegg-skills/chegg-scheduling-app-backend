import React, { useEffect, useRef } from 'react'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import { X } from 'lucide-react'
import Button from '@mui/material/Button'
import type { ConfirmDialogProps } from './types'

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  isAlert = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const finalConfirmText = confirmText || (isAlert ? 'OK' : 'Yes')
  const finalCancelText = cancelText || 'No'
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      // Focus the confirm button when the dialog opens
      setTimeout(() => {
        confirmButtonRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onConfirm()
    }
  }

  return (
    <Dialog open={isOpen} onClose={onCancel} fullWidth maxWidth="sm" onKeyDown={handleKeyDown}>
      <DialogTitle
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 2 }}
      >
        {title}
        <IconButton onClick={onCancel} aria-label="Close" size="small">
          <X size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ py: 3 }}>
        <Typography variant="body1" color="text.primary" sx={{ whiteSpace: 'pre-wrap' }}>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Stack direction="row" spacing={1.5}>
          {!isAlert && (
            <Button
              variant="outlined"
              onClick={handleCancel}
              size="small"
              sx={{ borderRadius: 1.5, height: 40, px: 2, fontSize: '0.875rem' }}
            >
              {finalCancelText}
            </Button>
          )}
          <Button
            variant="contained"
            color={isAlert ? 'primary' : 'error'}
            onClick={onConfirm}
            size="small"
            ref={confirmButtonRef}
            sx={{ borderRadius: 1.5, height: 40, px: 2, fontSize: '0.875rem' }}
          >
            {finalConfirmText}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  )

  function handleCancel() {
    onCancel()
  }
}
