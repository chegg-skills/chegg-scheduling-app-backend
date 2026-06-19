import Button from '@mui/material/Button'

interface TroubleshootSlotsButtonProps {
  show: boolean
  onClick: () => void
}

export function TroubleshootSlotsButton({ show, onClick }: TroubleshootSlotsButtonProps) {
  return (
    <Button
      onClick={onClick}
      sx={{
        fontWeight: 700,
        textTransform: 'none',
        fontSize: '0.75rem',
        color: 'primary.main',
        border: '1px solid',
        borderColor: 'primary.main',
        borderRadius: 1.5,
        px: 1.5,
        py: 0.5,
        '&:hover': { bgcolor: 'primary.light' },
      }}
    >
      {show ? 'Hide Debug' : 'Troubleshoot Slots'}
    </Button>
  )
}
