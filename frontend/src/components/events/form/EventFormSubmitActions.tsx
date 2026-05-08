import { useFormContext } from 'react-hook-form'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { Info } from 'lucide-react'
import { Button } from '@/components/shared/ui/Button'
import type { EventFormValues } from './eventFormSchema'

interface EventFormSubmitActionsProps {
  isPending: boolean
  isEdit: boolean
  onCancel?: () => void
  defaultActive?: boolean
}

/**
 * Handles form submission and active/inactive toggle.
 * Consumes the EventForm context for the register function.
 */
export function EventFormSubmitActions({
  isPending,
  isEdit,
  onCancel,
  defaultActive = true,
}: EventFormSubmitActionsProps) {
  const { register } = useFormContext<EventFormValues>()

  return (
    <Stack spacing={4}>
      <Box sx={{ py: 1 }}>
        <FormControlLabel
          label={
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="body2" fontWeight={500}>
                Event is Active
              </Typography>
              <Tooltip title="Inactive events are hidden from the public booking page and cannot be booked by students.">
                <Box sx={{ display: 'flex', color: 'text.secondary', cursor: 'default' }}>
                  <Info size={14} />
                </Box>
              </Tooltip>
            </Stack>
          }
          control={<Switch defaultChecked={defaultActive} {...register('isActive')} />}
        />
      </Box>

      <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ pt: 1 }}>
        <Button variant="secondary" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isPending} sx={{ minWidth: 160 }}>
          {isEdit ? 'Save changes' : 'Create event'}
        </Button>
      </Stack>
    </Stack>
  )
}
