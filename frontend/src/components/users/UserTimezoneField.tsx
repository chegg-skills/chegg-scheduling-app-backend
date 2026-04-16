import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import ListSubheader from '@mui/material/ListSubheader'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { Controller, useWatch, type Control, type FieldErrors } from 'react-hook-form'
import { FormField } from '@/components/shared/form/FormField'
import { Select } from '@/components/shared/form/Select'
import { useTimezones } from '@/hooks/queries/useConfig'
import type { UserFormValues } from './userFormSchema'
import { getTimezoneInfo, groupTimezonesByRegion } from './userSystemFieldUtils'

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

  const groupedTimezones = useMemo(
    () =>
      groupTimezonesByRegion(
        timezones.filter((timezone): timezone is string => typeof timezone === 'string')
      ),
    [timezones]
  )

  return (
    <FormField
      label="Timezone"
      htmlFor="timezone"
      error={errors.timezone?.message}
      hint={
        currentTime && selectedTimezone
          ? `Current time in ${selectedTimezone.replace(/_/g, ' ')}: ${currentTime}`
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

              return getTimezoneInfo(selected as string, now).name
            }}
          >
            <MenuItem value="">
              <em>Choose a timezone...</em>
            </MenuItem>

            {Object.entries(groupedTimezones).map(([region, regionTimezones]) => [
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
              regionTimezones.map((timezone) => {
                const info = getTimezoneInfo(timezone, now)

                return (
                  <MenuItem key={timezone} value={timezone} sx={{ py: 1.5, px: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        width: '100%',
                        alignItems: 'center',
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {info.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ ml: 2, color: 'text.secondary', fontWeight: 400 }}
                      >
                        {info.time}
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
