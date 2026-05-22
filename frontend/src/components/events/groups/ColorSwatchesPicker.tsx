import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import { Button } from '@/components/shared/ui/Button'
import { GROUP_COLOR_SWATCHES } from '@/utils/color'

interface ColorSwatchesPickerProps {
  selectedColor: string | null
  onColorSelect: (color: string | null) => void
}

export function ColorSwatchesPicker({ selectedColor, onColorSelect }: ColorSwatchesPickerProps) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
      {GROUP_COLOR_SWATCHES.map((swatch) => (
        <Box
          key={swatch}
          role="button"
          aria-label={`Color ${swatch}`}
          aria-pressed={selectedColor === swatch}
          onClick={() => onColorSelect(selectedColor === swatch ? null : swatch)}
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            backgroundColor: swatch,
            cursor: 'pointer',
            outline: selectedColor === swatch ? '3px solid' : 'none',
            outlineColor: 'primary.main',
            outlineOffset: '2px',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'scale(1.15)',
            },
          }}
        />
      ))}
      {selectedColor && (
        <Button variant="ghost" size="sm" onClick={() => onColorSelect(null)}>
          Clear
        </Button>
      )}
    </Stack>
  )
}
