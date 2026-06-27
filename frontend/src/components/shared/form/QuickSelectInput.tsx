import { forwardRef, useRef, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import { Input, type InputProps } from './Input'

export interface QuickSelectOption {
  label: string
  value: number | null
}

interface QuickSelectInputProps extends Omit<InputProps, 'name'> {
  name: string
  options: QuickSelectOption[]
  inputWidth?: number | string
}

export const QuickSelectInput = forwardRef<HTMLInputElement, QuickSelectInputProps>(
  ({ name, options, inputWidth = 160, ...props }, ref) => {
    const { setValue, watch } = useFormContext()
    const currentValue = watch(name)
    const localRef = useRef<HTMLInputElement | null>(null)

    const setRefs = (element: HTMLInputElement | null) => {
      localRef.current = element
      if (typeof ref === 'function') {
        ref(element)
      } else if (ref) {
        ref.current = element
      }
    }

    useEffect(() => {
      const element = localRef.current
      if (!element) return

      const onWheel = (e: WheelEvent) => {
        e.preventDefault()
      }

      element.addEventListener('wheel', onWheel, { passive: false })
      return () => {
        element.removeEventListener('wheel', onWheel)
      }
    }, [])

    const handleSelect = (value: number | null) => {
      setValue(name, value, { shouldValidate: true, shouldDirty: true })
    }

    const isOptionActive = (optValue: number | null) => {
      if (optValue === null) {
        return currentValue === null || currentValue === undefined || currentValue === ''
      }
      return currentValue !== null && currentValue !== undefined && currentValue !== '' && Number(currentValue) === optValue
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
      }
      if (props.onKeyDown) {
        props.onKeyDown(e)
      }
    }

    return (
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
        <Box sx={{ width: inputWidth, flexShrink: 0 }}>
          <Input
            ref={setRefs}
            name={name}
            onKeyDown={handleKeyDown}
            sx={{
              '& input[type=number]': {
                MozAppearance: 'textfield',
              },
              '& input[type=number]::-webkit-outer-spin-button': {
                WebkitAppearance: 'none',
                margin: 0,
              },
              '& input[type=number]::-webkit-inner-spin-button': {
                WebkitAppearance: 'none',
                margin: 0,
              },
              ...props.sx,
            }}
            {...props}
          />
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
          {options.map((opt) => {
            const isActive = isOptionActive(opt.value)
            return (
              <Button
                key={opt.value ?? 'null'}
                size="small"
                variant={isActive ? 'contained' : 'outlined'}
                color={isActive ? 'primary' : 'inherit'}
                onClick={() => handleSelect(opt.value)}
                sx={{
                  minWidth: 'auto',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1.5,
                  textTransform: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  height: 32,
                  ...(isActive ? {
                    boxShadow: 'none',
                  } : {
                    borderColor: 'divider',
                    color: 'text.secondary',
                    '&:hover': {
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      bgcolor: 'primary.lighter',
                    },
                  }),
                }}
              >
                {opt.label}
              </Button>
            )
          })}
        </Stack>
      </Stack>
    )
  }
)

QuickSelectInput.displayName = 'QuickSelectInput'
