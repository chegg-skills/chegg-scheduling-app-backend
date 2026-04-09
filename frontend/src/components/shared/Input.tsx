import { forwardRef } from 'react'
import TextField, { type TextFieldProps } from '@mui/material/TextField'

export interface InputProps extends Omit<TextFieldProps, 'variant' | 'size' | 'error'> {
  hasError?: boolean
  isSearch?: boolean
  min?: number | string
  max?: number | string
  step?: number | string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ hasError, isSearch, min, max, step, inputProps, sx, ...props }, ref) => {
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
        sx={{
          ...(isSearch && {
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#F3F4F6', // Light grey BG
              '& fieldset': {
                border: 'none', // Remove border
              },
              '&:hover fieldset': {
                border: 'none',
              },
              '&.Mui-focused fieldset': {
                border: '1.5px solid',
                borderColor: 'primary.main',
              },
              '& .MuiInputBase-input::placeholder': {
                color: 'text.secondary',
                opacity: 0.8,
              },
              borderRadius: 1.5, // 12px
              height: 40,
              minHeight: 40,
              maxHeight: 40,
              display: 'flex',
              alignItems: 'center',
              boxSizing: 'border-box',
              '& .MuiInputBase-root': {
                height: 40,
                minHeight: 40,
                maxHeight: 40,
                display: 'flex',
                alignItems: 'center',
                boxSizing: 'border-box',
              },
              '& input': {
                height: 40,
                py: 0,
                boxSizing: 'border-box',
              }
            },
          }),
          ...sx,
        }}
        {...props}
      />
    )
  },
)

Input.displayName = 'Input'
