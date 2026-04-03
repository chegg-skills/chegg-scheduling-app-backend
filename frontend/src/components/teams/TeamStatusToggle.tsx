import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import { Controller, type Control, type FieldErrors } from 'react-hook-form'
import { FormField } from '@/components/shared/FormField'
import type { TeamFormValues } from './teamFormSchema'

interface TeamStatusToggleProps {
  control: Control<TeamFormValues>
  errors: FieldErrors<TeamFormValues>
}

export function TeamStatusToggle({ control, errors }: TeamStatusToggleProps) {
  return (
    <FormField label="Team Status" htmlFor="isActive" error={errors.isActive?.message}>
      <Controller
        name="isActive"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            label="Team is active"
            control={
              <Switch
                id="isActive"
                checked={field.value ?? true}
                onChange={(event) => field.onChange(event.target.checked)}
              />
            }
          />
        )}
      />
    </FormField>
  )
}
