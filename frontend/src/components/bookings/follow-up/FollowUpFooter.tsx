import { Box, Button } from '@mui/material'
import { alpha } from '@mui/material/styles'

interface FollowUpFooterProps {
  activeStep: number
  isPending: boolean
  primaryDisabled: boolean
  onBackOrCancel: () => void
  onPrimary: () => void
  extraAccessory?: React.ReactNode
}

/** Dialog footer with Back/Cancel and the primary Next/Confirm action. */
export function FollowUpFooter({
  activeStep,
  isPending,
  primaryDisabled,
  onBackOrCancel,
  onPrimary,
  extraAccessory,
}: FollowUpFooterProps) {
  return (
    <Box
      sx={{
        py: 2,
        px: 3,
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {extraAccessory}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
        onClick={onBackOrCancel}
        disabled={isPending}
        sx={{
          fontWeight: 700,
          textTransform: 'none',
          color: 'text.secondary',
          px: 3,
          py: 1.25,
          borderRadius: 3,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        {activeStep === 0 ? 'Cancel' : 'Back'}
      </Button>

      <Button
        variant="contained"
        size="large"
        disabled={primaryDisabled}
        onClick={onPrimary}
        sx={{
          px: activeStep === 1 ? 4 : 6,
          py: 1.25,
          minWidth: activeStep === 1 ? 220 : 140,
          fontWeight: 800,
          borderRadius: 3,
          bgcolor: 'primary.main',
          boxShadow: (theme) => `0 12px 24px -8px ${alpha(theme.palette.primary.main, 0.4)}`,
          textTransform: 'none',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            bgcolor: 'primary.dark',
            boxShadow: (theme) => `0 16px 32px -8px ${alpha(theme.palette.primary.main, 0.5)}`,
          },
        }}
      >
        {isPending ? 'Confirming...' : activeStep === 1 ? 'Confirm booking' : 'Next'}
      </Button>
      </Box>
    </Box>
  )
}
