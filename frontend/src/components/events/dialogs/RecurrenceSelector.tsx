import { useState, useEffect } from 'react'
import { addWeeks, addMonths, addDays, format } from 'date-fns'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { FormField } from '@/components/shared/form/FormField'
import { Select } from '@/components/shared/form/Select'
import { Input } from '@/components/shared/form/Input'
import { Switch } from '@/components/shared/form/Switch'
import { InfoTooltip } from '@/components/shared/ui/InfoTooltip'
import { Calendar as CalendarIcon } from 'lucide-react'

export type RecurrenceFrequency =
  | 'WEEKLY'
  | 'BI_WEEKLY'
  | 'MONTHLY'
  | 'TWICE_A_MONTH'
  | 'THRICE_A_WEEK'

export interface RecurrenceConfig {
  frequency: RecurrenceFrequency
  occurrences: number | null
  isContinuous?: boolean
  recurrenceVisibilityLimit?: number | null
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
  const count = config.isContinuous ? 5 : (config.occurrences ?? 1)
  for (let i = 0; i < count; i++) {
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
    value && value.occurrences != null ? value.occurrences.toString() : '4'
  )
  const [localVisibilityLimit, setLocalVisibilityLimit] = useState(
    value && value.recurrenceVisibilityLimit != null ? value.recurrenceVisibilityLimit.toString() : ''
  )

  useEffect(() => {
    if (value) {
      if (value.isContinuous) {
        setLocalOccurrences('')
      } else if (value.occurrences != null) {
        const parsedLocal = parseInt(localOccurrences, 10)
        if (value.occurrences !== parsedLocal) {
          setLocalOccurrences(value.occurrences.toString())
        }
      }
    }
  }, [value?.occurrences, value?.isContinuous])

  useEffect(() => {
    if (value) {
      if (value.recurrenceVisibilityLimit != null) {
        const parsedLocal = parseInt(localVisibilityLimit, 10)
        if (value.recurrenceVisibilityLimit !== parsedLocal) {
          setLocalVisibilityLimit(value.recurrenceVisibilityLimit.toString())
        }
      } else {
        setLocalVisibilityLimit('')
      }
    }
  }, [value?.recurrenceVisibilityLimit])

  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      onChange({ frequency: 'WEEKLY', occurrences: 4, isContinuous: false, recurrenceVisibilityLimit: null })
      setLocalOccurrences('4')
      setLocalVisibilityLimit('')
    } else {
      onChange(null)
    }
  }

  const handleIndefiniteToggle = (continuous: boolean) => {
    if (!value) return
    if (continuous) {
      // Preserve the current count in localOccurrences so it can be restored if the user toggles back
      const parsed = parseInt(localOccurrences, 10)
      const savedOcc = !isNaN(parsed) && parsed >= 1 ? parsed : (value.occurrences ?? 4)
      setLocalOccurrences(savedOcc.toString())
      onChange({
        ...value,
        occurrences: null,
        isContinuous: true,
      })
    } else {
      const parsed = parseInt(localOccurrences, 10)
      const occ = !isNaN(parsed) && parsed >= 1 ? parsed : 4
      onChange({
        ...value,
        occurrences: occ,
        isContinuous: false,
      })
      setLocalOccurrences(occ.toString())
    }
  }

  const handleOccurrencesChange = (val: string) => {
    if (value?.isContinuous) return
    const cleaned = val.replace(/[^0-9]/g, '')
    setLocalOccurrences(cleaned)

    const parsed = parseInt(cleaned, 10)
    if (!isNaN(parsed) && parsed >= 1 && value) {
      onChange({ ...value, occurrences: parsed })
    }
  }

  const handleBlur = () => {
    if (!value || value.isContinuous) return

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

  const handleVisibilityLimitChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '')
    setLocalVisibilityLimit(cleaned)

    const parsed = parseInt(cleaned, 10)
    if (value) {
      onChange({
        ...value,
        recurrenceVisibilityLimit: !isNaN(parsed) && parsed >= 1 ? parsed : null,
      })
    }
  }

  const handleVisibilityLimitBlur = () => {
    if (!value) return
    const parsed = parseInt(localVisibilityLimit, 10)
    if (localVisibilityLimit === '') {
      setLocalVisibilityLimit('')
      onChange({ ...value, recurrenceVisibilityLimit: null })
    } else if (isNaN(parsed) || parsed < 1) {
      setLocalVisibilityLimit('1')
      onChange({ ...value, recurrenceVisibilityLimit: 1 })
    } else {
      setLocalVisibilityLimit(parsed.toString())
      onChange({ ...value, recurrenceVisibilityLimit: parsed })
    }
  }

  return (
    <Stack spacing={2} sx={{ mt: 1, pt: 1 }}>
      <Box
        sx={{
          p: 2,
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: 'divider',
          transition: 'all 0.2s ease',
        }}
      >
        <Switch
          label="Repeat this session (Recurring)"
          checked={isEnabled}
          onChange={handleToggle}
          disabled={disabled}
        />

        {isEnabled && (
          <Stack spacing={2} sx={{ mt: 2.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <FormField label="Frequency" htmlFor="recurrence-frequency">
                  <Select
                    value={value.frequency}
                    onChange={(e) =>
                      onChange({ ...value, frequency: e.target.value as RecurrenceFrequency })
                    }
                    disabled={disabled}
                    sx={{
                      borderRadius: 1.5,
                      '& fieldset': {
                        borderColor: 'divider',
                      },
                    }}
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
                    id="recurrence-occurrences"
                    type="text"
                    value={localOccurrences}
                    onChange={(e) => handleOccurrencesChange(e.target.value)}
                    onBlur={handleBlur}
                    disabled={disabled || value.isContinuous}
                    sx={{ borderRadius: 1.5 }}
                  />
                </FormField>
              </Box>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <FormField
                  label="Recurrence Visibility Limit (slots)"
                  htmlFor="recurrence-visibility-limit"
                  info="How many upcoming recurring slots are visible to students at one time. Leave empty for all."
                >
                  <Input
                    id="recurrence-visibility-limit"
                    type="text"
                    placeholder="e.g. 5"
                    value={localVisibilityLimit}
                    onChange={(e) => handleVisibilityLimitChange(e.target.value)}
                    onBlur={handleVisibilityLimitBlur}
                    disabled={disabled}
                    sx={{ borderRadius: 1.5 }}
                  />
                </FormField>
              </Box>
              <Box sx={{ flex: 1, display: { xs: 'none', sm: 'block' } }} />
            </Stack>

            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
              <Switch
                label="Repeat indefinitely (continuous series)"
                checked={!!value.isContinuous}
                onChange={handleIndefiniteToggle}
                disabled={disabled}
              />
              <InfoTooltip title="Continuous series automatically pre-generate slots up to 90 days in advance. As time passes, new slots are dynamically added to maintain the rolling window indefinitely until manually stopped." />
            </Stack>

            {startDate && (
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  border: '1px dashed',
                  borderColor: 'divider',
                }}
              >
                <Typography
                  variant="caption"
                  color="text.primary"
                  display="block"
                  sx={{
                    mb: 1.25,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                  }}
                >
                  <CalendarIcon size={14} style={{ opacity: 0.7 }} />
                  Scheduled dates preview:
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: 1,
                  }}
                >
                  {generatePreviewDates(startDate, value).map((date, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 0.75,
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="caption" fontWeight={700} color="primary.main">
                        #{i + 1}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(date, 'EEE, MMM d, yyyy @ h:mm a')}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                {value.isContinuous && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ fontStyle: 'italic', mt: 1 }}
                  >
                    ...repeats indefinitely (rolling 90-day window)
                  </Typography>
                )}
              </Box>
            )}
          </Stack>
        )}
      </Box>
    </Stack>
  )
}
