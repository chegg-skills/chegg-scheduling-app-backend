import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = { sm: 18, md: 32, lg: 48 }

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return <CircularProgress size={sizeMap[size]} className={className} aria-label="Loading" />
}

export function PageSpinner() {
  return (
    <Box sx={{ display: 'flex', minHeight: 256, alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size="lg" />
    </Box>
  )
}
