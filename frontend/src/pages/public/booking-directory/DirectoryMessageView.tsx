import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import LogoOrange from '@/assets/Color=Orange.svg'

interface DirectoryMessageViewProps {
  title: string
  description: ReactNode
  /** Optional back-link rendered below the description. */
  backLink?: { label: string; to: string }
}

/**
 * Centered empty/not-found message for the public booking directory. Used for
 * the "no sessions", "category not found", and "team not found" states.
 */
export function DirectoryMessageView({ title, description, backLink }: DirectoryMessageViewProps) {
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 320,
        textAlign: 'center',
        px: 4,
      }}
    >
      <Box
        component="img"
        src={LogoOrange}
        alt="Chegg Skills"
        sx={{ height: 32, mb: 3, opacity: 0.5 }}
      />
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: backLink ? 3 : 0 }}>
        {description}
      </Typography>
      {backLink && (
        <Box
          role="button"
          tabIndex={0}
          onClick={() => navigate(backLink.to)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') navigate(backLink.to)
          }}
          sx={{
            color: 'primary.main',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          <ChevronLeft size={16} style={{ marginRight: 6 }} />
          {backLink.label}
        </Box>
      )}
    </Box>
  )
}
