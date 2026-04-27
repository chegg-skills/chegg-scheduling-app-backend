import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

interface SectionHeaderProps {
  title: string
  description?: string | React.ReactNode
  action?: React.ReactNode
}

/**
 * Standardized header for event detail tabs and sections.
 * Consistently applies variant="subtitle1", fontWeight: 600 for the title
 * and variant="body2" for the description.
 */
export function SectionHeader({ title, description, action }: SectionHeaderProps) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}
      </Box>
      {action && <Box>{action}</Box>}
    </Stack>
  )
}
