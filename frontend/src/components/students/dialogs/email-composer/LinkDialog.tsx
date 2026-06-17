import {
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import { X } from 'lucide-react'
import { Button } from '@/components/shared/ui/Button'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'

interface LinkDialogProps {
  open: boolean
  isEditing: boolean
  linkUrl: string
  onUrlChange: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}

/** Insert/edit-link dialog for the email composer. */
export function LinkDialog({
  open,
  isEditing,
  linkUrl,
  onUrlChange,
  onClose,
  onConfirm,
}: LinkDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: '16px', // Matches MuiDialog paper styles override in theme.ts
          p: 1,
        },
      }}
    >
      <DialogTitle
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}
      >
        <Typography variant="h6" fontWeight={700}>
          {isEditing ? 'Edit Link' : 'Insert Link'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <X size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ py: 2 }}>
        <FormField label="URL Address" htmlFor="link-dialog-url" required>
          <Input
            id="link-dialog-url"
            placeholder="e.g. https://example.com"
            value={linkUrl}
            onChange={(e) => onUrlChange(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && linkUrl.trim()) {
                e.preventDefault()
                onConfirm()
              }
            }}
          />
        </FormField>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={!linkUrl.trim()}>
          {isEditing ? 'Update Link' : 'Insert URL'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
