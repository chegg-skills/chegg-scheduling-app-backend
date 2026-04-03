import Stack from '@mui/material/Stack'
import { Button } from '@/components/shared/Button'

interface UserFormActionBarProps {
  isPending: boolean
  onCancel: () => void
  submitLabel?: string
}

export function UserFormActionBar({
  isPending,
  onCancel,
  submitLabel = 'Save changes',
}: UserFormActionBarProps) {
  return (
    <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ pt: 1 }}>
      <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>
        Cancel
      </Button>
      <Button type="submit" isLoading={isPending} sx={{ minWidth: 160 }}>
        {submitLabel}
      </Button>
    </Stack>
  )
}
