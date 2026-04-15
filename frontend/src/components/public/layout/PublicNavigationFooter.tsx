import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
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
}: PublicNavigationFooterProps) {
  return (
    <Box
      sx={{
        py: 2,
        px: { xs: 2, md: 2 },
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <Box sx={{ minWidth: 100 }}>
        {showBack && (
          <Button
            disabled={backDisabled || isSubmitting}
            onClick={onBack}
            startIcon={<ChevronLeft size={18} />}
            sx={{
              fontWeight: 700,
              textTransform: 'none',
              color: 'text.secondary',
              visibility: backDisabled ? 'hidden' : 'visible',
            }}
          >
            {backLabel}
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mr: 2 }}>
        {isSubmitting && (
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {submittingLabel}
          </Typography>
        )}
        <Button
          variant="contained"
          size="large"
          disabled={nextDisabled || isSubmitting}
          onClick={onNext}
          sx={{
            px: 6,
            py: 1.25,
            fontWeight: 800,
            borderRadius: 3,
            bgcolor: 'primary.main',
            boxShadow: (theme) => `0 12px 24px -8px ${alpha(theme.palette.primary.main, 0.4)}`,
            textTransform: 'none',
            '&:hover': {
              bgcolor: 'primary.dark',
              boxShadow: (theme) => `0 16px 32px -8px ${alpha(theme.palette.primary.main, 0.5)}`,
            },
          }}
        >
          {isSubmitting ? submittingLabel : nextLabel}
        </Button>
      </Box>
    </Box>
  )
}
