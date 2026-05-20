import { useEffect, useMemo, useState } from 'react'
import ListSubheader from '@mui/material/ListSubheader'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { Controller, useWatch, type Control, type FieldErrors } from 'react-hook-form'
import { FormField } from '@/components/shared/form/FormField'
import { Select } from '@/components/shared/form/Select'
import { useTimezones } from '@/hooks/queries/useConfig'
import type { UserFormValues } from './userFormSchema'
import { getTimezoneInfo, groupTimezonesByRegion, GROUP_ORDER } from './userSystemFieldUtils'

interface UserTimezoneFieldProps {
  control: Control<UserFormValues>
  errors: FieldErrors<UserFormValues>
}

export function UserTimezoneField({ control, errors }: UserTimezoneFieldProps) {
  const { data: timezones = [] } = useTimezones()
  const selectedTimezone = useWatch({ control, name: 'timezone' })
  const [currentTime, setCurrentTime] = useState('')
  const [now, setNow] = useState(new Date())

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

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const groupedTimezones = useMemo(() => groupTimezonesByRegion(timezones), [timezones])

  const selectedLabel = useMemo(() => {
    const match = timezones.find((tz) => tz.iana === selectedTimezone)
    if (match) return match.label
    if (selectedTimezone) return getTimezoneInfo(selectedTimezone, now).name
    return null
  }, [timezones, selectedTimezone, now])

  return (
    <FormField
      label="Timezone"
      htmlFor="timezone"
      error={errors.timezone?.message}
      hint={
        currentTime && selectedLabel
          ? `Current time in ${selectedLabel}: ${currentTime}`
          : 'Select your preferred timezone'
      }
    >
      <Controller
        name="timezone"
        control={control}
        render={({ field }) => (
          <Select
            {...field}
            id="timezone"
            hasError={!!errors.timezone}
            displayEmpty
            renderValue={(selected) => {
              if (!selected) {
                return <em>Choose a timezone...</em>
              }
              return selectedLabel ?? (selected as string).replace(/_/g, ' ')
            }}
          >
            <MenuItem value="">
              <em>Choose a timezone...</em>
            </MenuItem>

            {GROUP_ORDER.filter((region) => groupedTimezones[region]?.length).map((region) => [
              <ListSubheader
                key={region}
                sx={{
                  fontWeight: 800,
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  textTransform: 'uppercase',
                  lineHeight: '48px',
                  fontSize: '0.75rem',
                  letterSpacing: '0.05em',
                }}
              >
                {region}
              </ListSubheader>,
              groupedTimezones[region].map((tz) => {
                const { time } = getTimezoneInfo(tz.iana, now)

                return (
                  <MenuItem key={tz.iana} value={tz.iana} sx={{ py: 1.5, px: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        width: '100%',
                        alignItems: 'center',
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {tz.label}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ ml: 2, color: 'text.secondary', fontWeight: 400 }}
                      >
                        {time}
                      </Typography>
                    </Box>
                  </MenuItem>
                )
              }),
            ])}
          </Select>
        )}
      />
    </FormField>
  )
}
