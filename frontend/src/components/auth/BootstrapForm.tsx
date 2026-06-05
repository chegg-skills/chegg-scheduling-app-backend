import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import { Button } from '@/components/shared/ui/Button'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { useBootstrap } from '@/hooks/queries/useAuthMutations'
import { TimezoneSelectField } from '@/components/shared/form/TimezoneSelectField'
import { extractApiError } from '@/utils/apiError'

const schema = z.object({
  bootstrapSecret: z.string().min(1, 'Bootstrap secret is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  timezone: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function BootstrapForm() {
  const navigate = useNavigate()
  const { mutate, isPending, error } = useBootstrap()

  const {
    register,
    handleSubmit,
    control,
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

      <FormField
        label="Bootstrap Secret"
        htmlFor="bootstrapSecret"
        error={errors.bootstrapSecret?.message}
        hint="This is provided in your server configuration."
        required
      >
        <Input
          id="bootstrapSecret"
          type="password"
          hasError={!!errors.bootstrapSecret}
          {...register('bootstrapSecret')}
        />
      </FormField>

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

      <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          hasError={!!errors.email}
          {...register('email')}
        />
      </FormField>

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

      <TimezoneSelectField
        control={control}
        name="timezone"
        error={errors.timezone?.message}
      />

      <Button type="submit" isLoading={isPending} fullWidth>
        Create admin account
      </Button>
    </Stack>
  )
}
