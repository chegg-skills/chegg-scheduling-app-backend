import { useEffect, useMemo, useState } from 'react'
import { Controller, useWatch, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { FormField } from './FormField'
import { TimezoneSelect } from './TimezoneSelect'
import { useTimezones } from '@/hooks/queries/useConfig'
import { getTimezoneInfo } from '@/components/users/userSystemFieldUtils'

interface TimezoneSelectFieldProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label?: string
  hint?: string
  error?: string
}

export function TimezoneSelectField<T extends FieldValues>({
  control,
  name,
  label = 'Timezone',
  hint,
  error,
}: TimezoneSelectFieldProps<T>) {
  const { data: timezones = [] } = useTimezones()
  const selectedTimezone = useWatch({ control, name }) as string | undefined
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    if (!selectedTimezone) {
      setCurrentTime('')
      return
    }
    const updateTime = () => {
      try {
        const time = new Intl.DateTimeFormat('en-US', {
          timeZone: selectedTimezone,
          hour: 'numeric',
          minute: 'numeric',
          hour12: true,
        }).format(new Date())
        setCurrentTime(time)
      } catch {
        setCurrentTime('')
      }
    }
    updateTime()
    const timer = setInterval(updateTime, 30000)
    return () => clearInterval(timer)
  }, [selectedTimezone])

  // Resolve a human-readable label for the currently selected timezone.
  // The label comes from the API list for known zones; for any unlisted zone
  // (e.g. a deprecated alias not yet normalised) we fall back to getTimezoneInfo.
  // 'now' is NOT a dependency — the label doesn't change over time, only when
  // the selected timezone changes.
  const selectedLabel = useMemo(() => {
    const match = timezones.find((tz) => tz.iana === selectedTimezone)
    if (match) return match.label
    if (selectedTimezone) return getTimezoneInfo(selectedTimezone, new Date()).name
    return null
  }, [timezones, selectedTimezone])

  const resolvedHint =
    hint ??
    (currentTime && selectedLabel
      ? `Current time in ${selectedLabel}: ${currentTime}`
      : 'Select a timezone')

  return (
    <FormField label={label} htmlFor={`tz-field-${name}`} error={error} hint={resolvedHint}>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <TimezoneSelect
            id={`tz-field-${name}`}
            value={field.value || ''}
            onChange={field.onChange}
            hasError={!!error}
          />
        )}
      />
    </FormField>
  )
}
