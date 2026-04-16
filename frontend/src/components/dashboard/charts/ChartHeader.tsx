import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import { Info } from 'lucide-react'
import { COLORS } from './chartColors'

interface ChartHeaderProps {
  title: string
  description: string
}

export function ChartHeader({ title, description }: ChartHeaderProps) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Tooltip title={description} arrow placement="top">
        <IconButton
          size="small"
          sx={{ color: 'text.secondary', p: 0.5, '&:hover': { color: COLORS.primary } }}
        >
          <Info size={16} />
        </IconButton>
      </Tooltip>
    </Stack>
  )
}
