import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import { alpha } from '@mui/material/styles'
import type { SxProps, Theme } from '@mui/material/styles'
import { ChevronLeft } from 'lucide-react'

interface PublicNavigationFooterProps {
  onBack?: () => void
  onNext?: () => void
  backDisabled?: boolean
  nextDisabled?: boolean
  isSubmitting?: boolean
  backLabel?: string
  nextLabel?: string
  submittingLabel?: string
  showBack?: boolean
  onTroubleshoot?: () => void
  extraAccessory?: React.ReactNode
  nextButtonSx?: SxProps<Theme>
}

/**
 * PublicNavigationFooter provides a unified action bar at the bottom
 * of the public booking steps.
 */
export function PublicNavigationFooter({
  onBack,
  onNext,
  backDisabled = false,
  nextDisabled = false,
  isSubmitting = false,
  backLabel = 'Back',
  nextLabel = 'Next',
  submittingLabel = 'Confirming...',
  showBack = true,
  onTroubleshoot,
  extraAccessory,
  nextButtonSx,
}: PublicNavigationFooterProps) {
  const lowerLabel = nextLabel.toLowerCase()
  return (
    <Box
      sx={{
        py: 2,
        px: { xs: 2, md: 2 },
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: { xs: 'column-reverse', sm: 'row' },
        gap: 2,
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          minWidth: { xs: '100%', sm: 100 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: { xs: 'space-between', sm: 'flex-start' },
          gap: { xs: 1, sm: 2 },
          flexWrap: 'wrap',
        }}
      >
        {showBack && (
          <Button
            disabled={backDisabled || isSubmitting}
            onClick={onBack}
            startIcon={backLabel === 'Back' ? <ChevronLeft size={18} /> : undefined}
            sx={{
              fontWeight: 700,
              textTransform: 'none',
              color: 'text.secondary',
              display: backDisabled ? 'none' : 'inline-flex',
            }}
          >
            {backLabel}
          </Button>
        )}

        {onTroubleshoot && (
          <Button
            onClick={onTroubleshoot}
            sx={{
              fontWeight: 600,
              textTransform: 'none',
              color: 'text.secondary',
              fontSize: '0.75rem',
              p: 0.5,
              px: 1,
              borderRadius: 1.5,
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            Having trouble?
          </Button>
        )}
        {extraAccessory}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
        <Button
          variant="contained"
          size="large"
          disabled={nextDisabled || isSubmitting}
          onClick={onNext}
          sx={{
            width: { xs: '100%', sm: 'auto' },
            px: lowerLabel.includes('confirm') || lowerLabel.includes('reschedule') ? 4 : 6,
            py: 1.25,
            minWidth: {
              xs: 'unset',
              sm: lowerLabel.includes('confirm') || lowerLabel.includes('reschedule') ? 220 : 140,
            },
            fontWeight: 800,
            borderRadius: 3,
            bgcolor: 'primary.main',
            boxShadow: (theme) => `0 12px 24px -8px ${alpha(theme.palette.primary.main, 0.4)}`,
            textTransform: 'none',
            '&:hover': {
              bgcolor: 'primary.dark',
              boxShadow: (theme) => `0 16px 32px -8px ${alpha(theme.palette.primary.main, 0.5)}`,
            },
            ...nextButtonSx,
          }}
        >
          {isSubmitting ? submittingLabel : nextLabel}
        </Button>
      </Box>
    </Box>
  )
}
