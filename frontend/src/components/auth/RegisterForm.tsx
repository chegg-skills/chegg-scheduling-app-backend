import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Stack from '@mui/material/Stack'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/shared/Input'
import { Button } from '@/components/shared/Button'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { useRegister } from '@/hooks/useAuthMutations'
import { extractApiError } from '@/utils/apiError'

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  timezone: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function RegisterForm() {
  const navigate = useNavigate()
  const { mutate, isPending, error } = useRegister()

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

  function onSubmit(values: FormValues) {
    mutate(values, {
      onSuccess: () => navigate('/dashboard'),
    })
  }

  return (
    <Stack component="form" onSubmit={handleSubmit(onSubmit)} noValidate spacing={2.5}>
      {error && <ErrorAlert message={extractApiError(error)} />}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormField label="First Name" htmlFor="firstName" error={errors.firstName?.message} required>
          <Input id="firstName" hasError={!!errors.firstName} {...register('firstName')} />
        </FormField>
        <FormField label="Last Name" htmlFor="lastName" error={errors.lastName?.message} required>
          <Input id="lastName" hasError={!!errors.lastName} {...register('lastName')} />
        </FormField>
      </Stack>

      <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          hasError={!!errors.email}
          {...register('email')}
        />
      </FormField>

      <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
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
        hint="IANA timezone (e.g. America/New_York). Defaults to system timezone."
      >
        <Input
          id="timezone"
          placeholder="UTC"
          hasError={!!errors.timezone}
          {...register('timezone')}
        />
      </FormField>

      <Button type="submit" isLoading={isPending} fullWidth>
        Create account
      </Button>
    </Stack>
  )
}
