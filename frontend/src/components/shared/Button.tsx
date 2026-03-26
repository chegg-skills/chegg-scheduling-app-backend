import { forwardRef } from 'react'
import MuiButton, { type ButtonProps as MuiButtonProps } from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends Omit<MuiButtonProps, 'variant' | 'size' | 'color'> {
  variant?: Variant
  size?: Size
  isLoading?: boolean
}

const variantMap: Record<Variant, Pick<MuiButtonProps, 'variant' | 'color'>> = {
  primary: { variant: 'contained', color: 'primary' },
  secondary: { variant: 'outlined', color: 'inherit' },
  danger: { variant: 'contained', color: 'error' },
  ghost: { variant: 'text', color: 'inherit' },
}

const sizeMap: Record<Size, MuiButtonProps['size']> = {
  sm: 'small',
  md: 'medium',
  lg: 'large',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const mappedVariant = variantMap[variant]

    return (
      <MuiButton
        ref={ref}
        disabled={disabled || isLoading}
        disableElevation
        variant={mappedVariant.variant}
        color={mappedVariant.color}
        size={sizeMap[size]}
        className={className}
        sx={{
          gap: 1,
          px: size === 'sm' ? 1.5 : 2.5,
          py: size === 'sm' ? 0.75 : 1.25,
          '& .MuiCircularProgress-root': {
            mr: 1,
          },
          ...props.sx,
        }}
        {...props}
      >
        {isLoading ? <CircularProgress color="inherit" size={16} thickness={5} /> : null}
        {children}
      </MuiButton>
    )
  },
)

Button.displayName = 'Button'
