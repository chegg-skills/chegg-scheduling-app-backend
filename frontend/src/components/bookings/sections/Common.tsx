import Typography from '@mui/material/Typography'

export function SectionLabel({ label }: { label: string }) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        mb: 1.5,
        textTransform: 'uppercase',
        fontWeight: 700,
        letterSpacing: '0.05em',
      }}
    >
      {label}
    </Typography>
  )
}
