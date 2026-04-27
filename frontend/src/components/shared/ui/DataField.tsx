import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { InfoTooltip } from './InfoTooltip'

interface DataFieldProps {
  label: string
  value: React.ReactNode
  tooltip?: string
  sm?: number
  xs?: number
}

/**
 * Standardized data display field with label, value, and optional tooltip.
 * Ensures consistent alignment and typography across detail views.
 */
export function DataField({ 
  label, 
  value, 
  tooltip, 
  sm = 4, 
  xs = 12 
}: DataFieldProps) {
  return (
    <Grid size={{ xs, sm }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.25 }}>
        <Typography
          variant="caption"
          color="text.primary"
          sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.02em', opacity: 0.8 }}
        >
          {label}
        </Typography>
        {tooltip && <InfoTooltip title={tooltip} size={12} />}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
        {value}
      </Typography>
    </Grid>
  )
}
