import { forwardRef } from 'react'
import TextField, { type TextFieldProps } from '@mui/material/TextField'

interface InputProps extends Omit<TextFieldProps, 'variant' | 'size' | 'error'> {
  hasError?: boolean
  min?: number | string
  max?: number | string
  step?: number | string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ hasError, min, max, step, inputProps, ...props }, ref) => {
    return (
      <TextField
        inputRef={ref}
        size="small"
        variant="outlined"
        fullWidth
        error={hasError}
        inputProps={{
          min,
          max,
          step,
          ...inputProps,
        }}
        {...props}
      />
    )
  },
)

Input.displayName = 'Input'
