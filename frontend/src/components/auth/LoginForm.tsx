import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import { Eye, EyeOff } from 'lucide-react'
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
  const [showPassword, setShowPassword] = useState(false)

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
    <Stack spacing={2.5}>
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
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            hasError={!!errors.password}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword((prev) => !prev)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            {...register('password')}
          />
        </FormField>

        <Button type="submit" isLoading={isPending} fullWidth>
          Sign in
        </Button>
      </Stack>

      <Divider>
        <Typography variant="caption" color="text.secondary">
          OR
        </Typography>
      </Divider>

      {import.meta.env.VITE_SSO_ENABLED === 'true' ? (
        <Button component="a" href="/api/auth/sso/login" variant="secondary" fullWidth>
          Sign in with SSO
        </Button>
      ) : (
        <Button variant="secondary" fullWidth disabled>
          SSO — Coming Soon
        </Button>
      )}
    </Stack>
  )
}
