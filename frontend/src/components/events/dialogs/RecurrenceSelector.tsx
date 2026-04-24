import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { FormField } from '@/components/shared/form/FormField'
import { Select } from '@/components/shared/form/Select'
import { Input } from '@/components/shared/form/Input'

export type RecurrenceFrequency = 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY' | 'TWICE_A_MONTH' | 'THRICE_A_WEEK'

export interface RecurrenceConfig {
  frequency: RecurrenceFrequency
  occurrences: number
}

interface RecurrenceSelectorProps {
  value: RecurrenceConfig | null
  onChange: (value: RecurrenceConfig | null) => void
  disabled?: boolean
}

export const RecurrenceSelector: React.FC<RecurrenceSelectorProps> = ({
  value,
  onChange,
  disabled,
}) => {
  const isEnabled = !!value

  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      onChange({ frequency: 'WEEKLY', occurrences: 4 })
    } else {
      onChange(null)
    }
  }

  return (
    <Stack spacing={2} sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <input
          type="checkbox"
          id="enable-recurrence"
          checked={isEnabled}
          onChange={(e) => handleToggle(e.target.checked)}
          disabled={disabled}
          style={{ width: 18, height: 18, cursor: 'pointer' }}
        />
        <Typography
          component="label"
          htmlFor="enable-recurrence"
          variant="subtitle2"
          sx={{ cursor: 'pointer', fontWeight: 600 }}
        >
          Repeat this session
        </Typography>
      </Stack>

      {isEnabled && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Box sx={{ flex: 1 }}>
            <FormField label="Frequency" htmlFor="recurrence-frequency">
              <Select
                value={value.frequency}
                onChange={(e) =>
                  onChange({ ...value, frequency: e.target.value as RecurrenceFrequency })
                }
                disabled={disabled}
              >
                <MenuItem value="WEEKLY">Every week</MenuItem>
                <MenuItem value="BI_WEEKLY">Every 2 weeks</MenuItem>
                <MenuItem value="MONTHLY">Every month</MenuItem>
                <MenuItem value="TWICE_A_MONTH">Twice a month (every 14 days)</MenuItem>
                <MenuItem value="THRICE_A_WEEK">3 times a week</MenuItem>
              </Select>
            </FormField>
          </Box>

          <Box sx={{ width: { sm: 120 } }}>
            <FormField label="Occurrences" htmlFor="recurrence-occurrences">
              <Input
                type="number"
                value={value.occurrences}
                onChange={(e) =>
                  onChange({ ...value, occurrences: parseInt(e.target.value) || 1 })
                }
                min={1}
                max={50}
                disabled={disabled}
              />
            </FormField>
          </Box>
        </Stack>
      )}
    </Stack>
  )
}
