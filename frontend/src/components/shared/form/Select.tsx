import { forwardRef } from 'react'
import FormControl from '@mui/material/FormControl'
import MuiSelect, { type SelectProps as MuiSelectProps } from '@mui/material/Select'
import OutlinedInput from '@mui/material/OutlinedInput'

export type SelectProps = Omit<MuiSelectProps, 'variant' | 'size'> & {
  hasError?: boolean
}

export const Select = forwardRef<HTMLDivElement, SelectProps>(
  ({ hasError, children, MenuProps, ...props }, ref) => {
    return (
      <FormControl fullWidth error={hasError} size="small">
        <MuiSelect
          input={<OutlinedInput notched={false} />}
          ref={ref}
          MenuProps={{
            anchorOrigin: {
              vertical: 'bottom',
              horizontal: 'left',
            },
            transformOrigin: {
              vertical: 'top',
              horizontal: 'left',
            },
            disableScrollLock: true,
            variant: 'menu',
            ...MenuProps,
            PaperProps: {
              sx: {
                borderRadius: 1.5,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                mt: 0.5,
              },
              ...MenuProps?.PaperProps,
            },
          }}
          {...props}
        >
          {children}
        </MuiSelect>
      </FormControl>
    )
  }
)

Select.displayName = 'Select'
