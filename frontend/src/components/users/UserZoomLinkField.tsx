import { useMemo } from 'react'
import { Controller, useWatch, type Control, type FieldErrors } from 'react-hook-form'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import type { UserFormValues } from './userFormSchema'

interface UserZoomLinkFieldProps {
  control: Control<UserFormValues>
  errors: FieldErrors<UserFormValues>
}

export function UserZoomLinkField({ control, errors }: UserZoomLinkFieldProps) {
  const zoomIsvLink = useWatch({ control, name: 'zoomIsvLink' })
  const expiresAt = useWatch({ control, name: 'zoomIsvLinkExpiresAt' })

  const minDate = useMemo(() => new Date(), [])
  const maxDate = useMemo(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() + 10)
    return d
  }, [])

  return (
    <Stack spacing={2.5}>
      <FormField
        label="Zoom ISV meeting link"
        htmlFor="zoomIsvLink"
        error={errors.zoomIsvLink?.message}
        hint="This coach-specific link is used for scheduled sessions and can be shared with learners."
      >
        <Controller
          name="zoomIsvLink"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="zoomIsvLink"
              type="url"
              placeholder="https://students.skills.chegg.com/meeting/join/..."
              value={field.value ?? ''}
              hasError={!!errors.zoomIsvLink}
            />
          )}
        />
      </FormField>

      {zoomIsvLink && (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
            p: 2,
            bgcolor: 'grey.50',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <FormField
            label="Link expiry date"
            htmlFor="zoomIsvLinkExpiresAt"
            error={errors.zoomIsvLinkExpiresAt?.message}
            hint="Set this to receive a reminder email."
          >
            <Controller
              name="zoomIsvLinkExpiresAt"
              control={control}
              render={({ field }) => (
                <DatePicker
                  value={field.value ? new Date(field.value + 'T12:00:00') : null}
                  onChange={(date) => {
                    if (!date) { field.onChange(null); return }
                    const y = date.getFullYear()
                    const mo = String(date.getMonth() + 1).padStart(2, '0')
                    const d = String(date.getDate()).padStart(2, '0')
                    field.onChange(`${y}-${mo}-${d}`)
                  }}
                  minDate={minDate}
                  maxDate={maxDate}
                  slotProps={{
                    textField: {
                      id: 'zoomIsvLinkExpiresAt',
                      fullWidth: true,
                      size: 'small',
                      error: !!errors.zoomIsvLinkExpiresAt,
                      sx: {
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'background.paper',
                        },
                      },
                    },
                  }}
                />
              )}
            />
          </FormField>

          <FormField
            label="Remind me"
            htmlFor="zoomIsvLinkReminderDays"
            error={errors.zoomIsvLinkReminderDays?.message}
            hint="Days before expiry."
          >
            <Controller
              name="zoomIsvLinkReminderDays"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="zoomIsvLinkReminderDays"
                  type="number"
                  placeholder="e.g. 7"
                  disabled={!expiresAt}
                  inputProps={{ min: 1, max: 90 }}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const val = e.target.value
                    field.onChange(val === '' ? null : Number(val))
                  }}
                  hasError={!!errors.zoomIsvLinkReminderDays}
                  sx={{ bgcolor: 'background.paper' }}
                />
              )}
            />
          </FormField>
        </Box>
      )}
    </Stack>
  )
}
