import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Stack from '@mui/material/Stack'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import { Button } from '@/components/shared/ui/Button'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { useLogin } from '@/hooks/queries/useAuthMutations'
import { extractApiError } from '@/utils/apiError'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

export function LoginForm() {
  const navigate = useNavigate()
  const { mutate, isPending, error } = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  function onSubmit(values: FormValues) {
    mutate(values, {
      onSuccess: () => navigate('/dashboard'),
    })
  }

  return (
    <Stack component="form" onSubmit={handleSubmit(onSubmit)} noValidate spacing={2.5}>
      {error && <ErrorAlert message={extractApiError(error)} />}

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
          autoComplete="current-password"
          hasError={!!errors.password}
          {...register('password')}
        />
      </FormField>

      <Button type="submit" isLoading={isPending} fullWidth>
        Sign in
      </Button>
    </Stack>
  )
}
