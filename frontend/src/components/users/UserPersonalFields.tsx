import { Controller } from 'react-hook-form'
import type { UseFormRegister, FieldErrors, Control } from 'react-hook-form'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/shared/Input'
import { Autocomplete } from '@/components/shared/Autocomplete'
import { useCountries, useLanguages } from '@/hooks/useConfig'
import type { UserFormValues } from './userFormSchema'

interface UserPersonalFieldsProps {
  register: UseFormRegister<UserFormValues>
  errors: FieldErrors<UserFormValues>
  control: Control<UserFormValues>
  isCreateMode: boolean
  disabledFields?: {
    email?: boolean
  }
}

/** Handles firstName, lastName, email, phoneNumber, country, password fields */
export function UserPersonalFields({
  register,
  errors,
  control,
  isCreateMode,
  disabledFields,
}: UserPersonalFieldsProps) {
  const { data: countries = [] } = useCountries()
  const { data: languages = [] } = useLanguages()
  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
        <FormField
          label="First Name"
          htmlFor="firstName"
          error={errors.firstName?.message}
          required
        >
          <Input
            id="firstName"
            hasError={!!errors.firstName}
            {...register('firstName')}
          />
        </FormField>

        <FormField
          label="Last Name"
          htmlFor="lastName"
          error={errors.lastName?.message}
          required
        >
          <Input id="lastName" hasError={!!errors.lastName} {...register('lastName')} />
        </FormField>
      </Box>

      <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
        <Input
          id="email"
          type="email"
          autoComplete="off"
          hasError={!!errors.email}
          disabled={disabledFields?.email}
          {...register('email')}
        />
      </FormField>

      <FormField
        label="Password"
        htmlFor="password"
        error={errors.password?.message}
        hint={isCreateMode ? 'Minimum 8 characters.' : 'Leave blank to keep current password.'}
        required={isCreateMode}
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          hasError={!!errors.password}
          {...register('password')}
        />
      </FormField>

      <FormField
        label="Phone Number"
        htmlFor="phoneNumber"
        error={errors.phoneNumber?.message}
      >
        <Input
          id="phoneNumber"
          type="tel"
          hasError={!!errors.phoneNumber}
          {...register('phoneNumber')}
        />
      </FormField>

      <FormField
        label="Country"
        htmlFor="country"
        error={errors.country?.message}
      >
        <Controller
          name="country"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Autocomplete<{ code: string; name: string }, false, false, true>
              options={countries}
              getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
              isOptionEqualToValue={(option, val) => {
                const optionName = typeof option === 'string' ? option : option.name
                const valName = typeof val === 'string' ? val : val?.name
                return optionName === valName
              }}
              value={countries.find((c) => c.name === value) || value || null}
              onChange={(_, newValue) => {
                onChange(typeof newValue === 'string' ? newValue : newValue?.name || '')
              }}
              onInputChange={(_, newInputValue) => {
                onChange(newInputValue)
              }}
              placeholder="Select or type country..."
              freeSolo
            />
          )}
        />
      </FormField>

      <FormField
        label="Preferred Language"
        htmlFor="preferredLanguage"
        error={errors.preferredLanguage?.message}
      >
        <Controller
          name="preferredLanguage"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Autocomplete<{ code: string; name: string }, false, false, true>
              options={languages}
              getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
              isOptionEqualToValue={(option, val) => {
                const optionName = typeof option === 'string' ? option : option.name
                const valName = typeof val === 'string' ? val : val?.name
                return optionName === valName
              }}
              value={languages.find(l => l.name === value) || value || null}
              onChange={(_, newValue) => {
                onChange(typeof newValue === 'string' ? newValue : newValue?.name || '')
              }}
              onInputChange={(_, newInputValue) => {
                onChange(newInputValue)
              }}
              placeholder="Select or type language..."
              freeSolo
            />
          )}
        />
      </FormField>
    </Stack>
  )
}
