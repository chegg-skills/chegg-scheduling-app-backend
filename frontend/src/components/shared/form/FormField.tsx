import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { InfoTooltip } from '../ui/InfoTooltip'

interface FormFieldProps {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  info?: string
  required?: boolean
  children: ReactNode
  className?: string
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  info,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <Stack spacing={0.5} className={className}>
      <Typography
        component="label"
        htmlFor={htmlFor}
        variant="body2"
        sx={{
          fontWeight: 600,
          color: 'text.primary',
          display: 'flex',
          alignItems: 'center',
          mb: 0.25,
        }}
      >
        {label}
        {required && (
          <Box component="span" sx={{ ml: 0.5, color: 'error.main' }}>
            *
          </Box>
        )}
        {info && <InfoTooltip title={info} />}
      </Typography>
      {children}
      {error ? (
        <Typography variant="caption" sx={{ color: 'error.main', mt: 0.25, display: 'block' }}>
          {error}
        </Typography>
      ) : hint ? (
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', mt: 0.25, display: 'block', opacity: 0.8 }}
        >
          {hint}
        </Typography>
      ) : null}
    </Stack>
  )
}
