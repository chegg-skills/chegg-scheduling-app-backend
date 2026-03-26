import type { UseFormRegister, FieldErrors } from 'react-hook-form'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/shared/Input'
import type { UserFormValues } from './UserForm'

interface Props {
  register: UseFormRegister<UserFormValues>
  errors: FieldErrors<UserFormValues>
  isCreateMode: boolean
}

/** Handles firstName, lastName, email, phoneNumber, password fields */
export function UserPersonalFields({ register, errors, isCreateMode }: Props) {
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
    </Stack>
  )
}
