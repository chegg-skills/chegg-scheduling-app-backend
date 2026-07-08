import { forwardRef, useState } from 'react'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import { Eye, EyeOff } from 'lucide-react'
import { Input, type InputProps } from './Input'

export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
  ({ sx, ...props }, ref) => {
    const [show, setShow] = useState(false)

    return (
      <Input
        ref={ref}
        type={show ? 'text' : 'password'}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={() => setShow((prev) => !prev)}
                edge="end"
                size="small"
              >
                {show ? <EyeOff size={20} /> : <Eye size={20} />}
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{
          // Suppress Edge's native password reveal button to prevent dual icons
          '& input::-ms-reveal': { display: 'none' },
          '& input::-ms-clear': { display: 'none' },
          ...sx,
        }}
        {...props}
      />
    )
  }
)

PasswordInput.displayName = 'PasswordInput'
