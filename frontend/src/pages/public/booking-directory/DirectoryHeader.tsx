import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import LogoOrange from '@/assets/Color=Orange.svg'

interface DirectoryHeaderProps {
  description: string | null
}

/** Branded header band for the public booking directory, with optional description. */
export function DirectoryHeader({ description }: DirectoryHeaderProps) {
  return (
    <Box
      sx={{
        px: { xs: 2, sm: 4 },
        pt: { xs: 3, sm: 5 },
        pb: { xs: 2, sm: 4 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'accent.peach',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          width: '240px',
          height: '240px',
          background: 'radial-gradient(circle, rgba(232,113,0,0.06) 0%, rgba(255,255,255,0) 70%)',
          borderRadius: '50%',
        },
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 2, sm: 3 }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        sx={{ mb: 1.5 }}
      >
        <Box component="img" src={LogoOrange} alt="Chegg Skills" sx={{ height: 32, flexShrink: 0 }} />
        {description && (
          <>
            <Divider
              orientation="vertical"
              flexItem
              sx={{ mx: 1, display: { xs: 'none', sm: 'block' } }}
            />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 500, lineHeight: 1.5, maxWidth: '640px' }}
            >
              {description}
            </Typography>
          </>
        )}
      </Stack>
    </Box>
  )
}
