import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import { Select } from '@/components/shared/form/Select'
import { Button } from '@/components/shared/ui/Button'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { useAcceptInvite } from '@/hooks/queries/useAuthMutations'
import { useTimezones } from '@/hooks/queries/useConfig'
import { extractApiError } from '@/utils/apiError'
import { invitesApi } from '@/api/invites'

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

  const { data: validationData, isLoading: isValidating } = useQuery({
    queryKey: ['invite-validate', token],
    queryFn: () => invitesApi.validate(token).then((r) => r.data.data),
    retry: false,
  })

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

  if (isValidating) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Verifying invite...
        </Typography>
      </Box>
    )
  }

  if (validationData && !validationData.valid) {
    const messages: Record<string, string> = {
      expired: 'This invite has expired. Please request a new one.',
      already_accepted: 'This invite has already been used.',
      not_found: 'This invite link is invalid or does not exist.',
    }
    return (
      <Stack spacing={1.5} sx={{ textAlign: 'center' }}>
        <Typography variant="body1" color="error">
          {messages[validationData.reason ?? 'not_found'] ?? 'Invalid invite.'}
        </Typography>
      </Stack>
    )
  }

  // SSO invite — show SSO sign-in button instead of password form
  if (validationData?.requiresSso) {
    return (
      <Stack spacing={2.5} alignItems="center">
        <Typography variant="body2" color="text.secondary" textAlign="center">
          This invite requires signing in with your organization's SSO provider.
        </Typography>
        <Button
          component="a"
          href={`/api/auth/sso/accept-invite?token=${encodeURIComponent(token)}`}
          fullWidth
        >
          Continue with SSO
        </Button>
      </Stack>
    )
  }

  // Standard password-based invite
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
