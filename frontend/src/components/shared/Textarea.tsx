import { forwardRef } from 'react'
import TextField, { type TextFieldProps } from '@mui/material/TextField'

interface TextareaProps extends Omit<TextFieldProps, 'variant' | 'size' | 'error' | 'multiline'> {
  hasError?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ hasError, ...props }, ref) => {
    return (
      <TextField
        inputRef={ref}
        size="small"
        variant="outlined"
        fullWidth
        multiline
        minRows={3}
        error={hasError}
        {...props}
      />
    )
  },
)

Textarea.displayName = 'Textarea'
