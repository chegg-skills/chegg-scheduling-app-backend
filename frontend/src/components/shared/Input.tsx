import { forwardRef } from 'react'
import TextField, { type TextFieldProps } from '@mui/material/TextField'

interface InputProps extends Omit<TextFieldProps, 'variant' | 'size' | 'error'> {
  hasError?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ hasError, ...props }, ref) => {
    return <TextField inputRef={ref} size="small" variant="outlined" fullWidth error={hasError} {...props} />
  },
)

Input.displayName = 'Input'
