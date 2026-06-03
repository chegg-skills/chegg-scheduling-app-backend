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
  charCount?: number
  charLimit?: number
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
  charCount,
  charLimit,
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
      {(error || hint || (charLimit !== undefined && charCount !== undefined)) && (
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mt: 0.25 }}>
          <Box sx={{ flexGrow: 1 }}>
            {error ? (
              <Typography variant="caption" sx={{ color: 'error.main', display: 'block' }}>
                {error}
              </Typography>
            ) : hint ? (
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', display: 'block', opacity: 0.8 }}
              >
                {hint}
              </Typography>
            ) : null}
          </Box>
          {charLimit !== undefined && charCount !== undefined && (
            <Typography
              variant="caption"
              sx={{
                color: charCount >= charLimit ? 'error.main' : 'text.secondary',
                fontWeight: charCount >= charLimit ? 600 : 400,
                ml: 2,
                whiteSpace: 'nowrap',
              }}
            >
              {charCount} / {charLimit}
            </Typography>
          )}
        </Stack>
      )}
    </Stack>
  )
}
