import { useState, useEffect } from 'react'
import { addWeeks, addMonths, addDays, format } from 'date-fns'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { FormField } from '@/components/shared/form/FormField'
import { Select } from '@/components/shared/form/Select'
import { Input } from '@/components/shared/form/Input'

export type RecurrenceFrequency =
  | 'WEEKLY'
  | 'BI_WEEKLY'
  | 'MONTHLY'
  | 'TWICE_A_MONTH'
  | 'THRICE_A_WEEK'

export interface RecurrenceConfig {
  frequency: RecurrenceFrequency
  occurrences: number
}

interface RecurrenceSelectorProps {
  value: RecurrenceConfig | null
  onChange: (value: RecurrenceConfig | null) => void
  disabled?: boolean
  startDate?: string
}

function generatePreviewDates(startDate: string, config: RecurrenceConfig): Date[] {
  const dates: Date[] = []
  let current = new Date(startDate)
  for (let i = 0; i < config.occurrences; i++) {
    dates.push(new Date(current))
    switch (config.frequency) {
      case 'WEEKLY':
        current = addWeeks(current, 1)
        break
      case 'BI_WEEKLY':
        current = addWeeks(current, 2)
        break
      case 'MONTHLY':
        current = addMonths(current, 1)
        break
      case 'TWICE_A_MONTH':
        current = addDays(current, 14)
        break
      case 'THRICE_A_WEEK':
        current = addDays(current, i % 3 === 2 ? 3 : 2)
        break
    }
    if (current.getFullYear() > new Date().getFullYear() + 2) break
  }
  return dates
}

export const RecurrenceSelector: React.FC<RecurrenceSelectorProps> = ({
  value,
  onChange,
  disabled,
  startDate,
}) => {
  const isEnabled = !!value

  const [localOccurrences, setLocalOccurrences] = useState(
    value ? value.occurrences.toString() : '4'
  )

  useEffect(() => {
    if (value) {
      const parsedLocal = parseInt(localOccurrences, 10)
      if (value.occurrences !== parsedLocal) {
        setLocalOccurrences(value.occurrences.toString())
      }
    }
  }, [value?.occurrences])

  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      onChange({ frequency: 'WEEKLY', occurrences: 4 })
      setLocalOccurrences('4')
    } else {
      onChange(null)
    }
  }

  const handleOccurrencesChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '')
    setLocalOccurrences(cleaned)

    const parsed = parseInt(cleaned, 10)
    if (!isNaN(parsed) && parsed >= 1 && value) {
      onChange({ ...value, occurrences: parsed })
    }
  }

  const handleBlur = () => {
    if (!value) return

    const parsed = parseInt(localOccurrences, 10)
    if (isNaN(parsed) || parsed < 1) {
      setLocalOccurrences('1')
      onChange({ ...value, occurrences: 1 })
    } else if (parsed > 50) {
      setLocalOccurrences('50')
      onChange({ ...value, occurrences: 50 })
    } else {
      setLocalOccurrences(parsed.toString())
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
        <>
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
              <FormField
                label="Occurrences"
                htmlFor="recurrence-occurrences"
                info="How many sessions to create in total, including the first one."
              >
                <Input
                  type="text"
                  value={localOccurrences}
                  onChange={(e) => handleOccurrencesChange(e.target.value)}
                  onBlur={handleBlur}
                  disabled={disabled}
                />
              </FormField>
            </Box>
          </Stack>

          {startDate && (
            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                sx={{ mb: 0.5, fontWeight: 600 }}
              >
                Sessions will be created on:
              </Typography>
              {generatePreviewDates(startDate, value).map((date, i) => (
                <Typography key={i} variant="caption" color="text.secondary" display="block">
                  {i + 1}. {format(date, 'EEE, MMM d, yyyy @ h:mm a')}
                </Typography>
              ))}
            </Box>
          )}
        </>
      )}
    </Stack>
  )
}
