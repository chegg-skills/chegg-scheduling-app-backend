import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import MenuItem from '@mui/material/MenuItem'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/shared/Input'
import { Select } from '@/components/shared/Select'
import { Button } from '@/components/shared/Button'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { useAcceptInvite } from '@/hooks/useAuthMutations'
import { useTimezones } from '@/hooks/useConfig'
import { extractApiError } from '@/utils/apiError'

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  timezone: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface AcceptInviteFormProps {
  token: string
}

export function AcceptInviteForm({ token }: AcceptInviteFormProps) {
  const navigate = useNavigate()
  const { mutate, isPending, error } = useAcceptInvite()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  })

  const { data: timezones = [] } = useTimezones()

  function onSubmit(values: FormValues) {
    mutate({ ...values, token }, { onSuccess: () => navigate('/dashboard') })
  }

  return (
    <Stack component="form" onSubmit={handleSubmit(onSubmit)} noValidate spacing={2.5}>
      {error && <ErrorAlert message={extractApiError(error)} />}

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
        }}
      >
        <FormField
          label="First Name"
          htmlFor="firstName"
          error={errors.firstName?.message}
          required
        >
          <Input id="firstName" hasError={!!errors.firstName} {...register('firstName')} />
        </FormField>

        <FormField label="Last Name" htmlFor="lastName" error={errors.lastName?.message} required>
          <Input id="lastName" hasError={!!errors.lastName} {...register('lastName')} />
        </FormField>
      </Box>

      <FormField
        label="Password"
        htmlFor="password"
        error={errors.password?.message}
        hint="Minimum 8 characters."
        required
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
        label="Timezone"
        htmlFor="timezone"
        error={errors.timezone?.message}
        hint="Select your preferred timezone. Defaults to system timezone."
      >
        <Select id="timezone" hasError={!!errors.timezone} {...register('timezone')} displayEmpty>
          <MenuItem value="">
            <em>Choose a timezone...</em>
          </MenuItem>
          {timezones.map((tz: string) => (
            <MenuItem key={tz} value={tz}>
              {tz.replace(/_/g, ' ')}
            </MenuItem>
          ))}
        </Select>
      </FormField>

      <Button type="submit" isLoading={isPending} fullWidth>
        Create account
      </Button>
    </Stack>
  )
}
