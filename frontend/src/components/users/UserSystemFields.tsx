import { useState, useEffect, useMemo } from 'react'
import { Controller, useWatch } from 'react-hook-form'
import type { FieldErrors, Control } from 'react-hook-form'
import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import ListSubheader from '@mui/material/ListSubheader'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { FormField } from '@/components/shared/FormField'
import { Select } from '@/components/shared/Select'
import { useTimezones } from '@/hooks/useConfig'
import type { UserFormValues } from './UserForm'
import type { UserRole } from '@/types'

interface Props {
  errors: FieldErrors<UserFormValues>
  control: Control<UserFormValues>
  canChangeRole: boolean
  canChangeActiveStatus: boolean
}

const USER_ROLES: UserRole[] = ['SUPER_ADMIN', 'TEAM_ADMIN', 'COACH']

function getTimezoneInfo(tz: string, now: Date) {
  try {
    const time = now.toLocaleTimeString('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).replace(/\s/g, '').toLowerCase()

    const name = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'long',
    }).formatToParts(now).find(p => p.type === 'timeZoneName')?.value || tz

    return { time, name }
  } catch (e) {
    return { time: '', name: tz }
  }
}

/** Handles role, timezone, isActive fields */
export function UserSystemFields({
  errors,
  control,
  canChangeRole,
  canChangeActiveStatus,
}: Props) {
  const { data: timezones = [] } = useTimezones()
  const selectedTimezone = useWatch({ control, name: 'timezone' })
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
      } catch (e) {
        setCurrentTime('')
      }
    }

    updateTime()
    const timer = setInterval(updateTime, 30000)
    return () => clearInterval(timer)
  }, [selectedTimezone])

  const groupedTimezones = useMemo(() => {
    const groups: Record<string, string[]> = {}
    timezones.forEach((tz) => {
      if (typeof tz !== 'string') return
      const region = tz.includes('/') ? tz.split('/')[0].replace(/_/g, ' ') : 'Universal'
      if (!groups[region]) groups[region] = []
      groups[region].push(tz)
    })
    return groups
  }, [timezones])

  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  return (
    <Stack spacing={2}>
      <FormField label="Role" htmlFor="role" error={errors.role?.message}>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              id="role"
              disabled={!canChangeRole}
              hasError={!!errors.role}
            >
              {USER_ROLES.map((r) => (
                <MenuItem key={r} value={r}>
                  {r.replace('_', ' ')}
                </MenuItem>
              ))}
            </Select>
          )}
        />
      </FormField>

      <FormField
        label="Timezone"
        htmlFor="timezone"
        error={errors.timezone?.message}
        hint={
          currentTime && selectedTimezone
            ? `Current time in ${selectedTimezone.replace(/_/g, ' ')}: ${currentTime}`
            : "Select your preferred timezone"
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
                if (!selected) return <em>Choose a timezone...</em>
                const info = getTimezoneInfo(selected as string, now)
                return info.name
              }}
            >
              <MenuItem value="">
                <em>Choose a timezone...</em>
              </MenuItem>
              {Object.entries(groupedTimezones).map(([region, tzs]) => [
                <ListSubheader
                  key={region}
                  sx={{
                    fontWeight: 800,
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    textTransform: 'uppercase',
                    lineHeight: '48px',
                    fontSize: '0.75rem',
                    letterSpacing: '0.05em'
                  }}
                >
                  {region}
                </ListSubheader>,
                tzs.map((tz) => {
                  const info = getTimezoneInfo(tz, now)
                  return (
                    <MenuItem key={tz} value={tz} sx={{ py: 1.5, px: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {info.name}
                        </Typography>
                        <Typography variant="body2" sx={{ ml: 2, color: 'text.secondary', fontWeight: 400 }}>
                          {info.time}
                        </Typography>
                      </Box>
                    </MenuItem>
                  )
                })
              ])}
            </Select>
          )}
        />
      </FormField>

      {canChangeActiveStatus && (
        <FormField label="Active Status" htmlFor="isActive" error={errors.isActive?.message}>
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    id="isActive"
                    checked={field.value ?? true}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                }
                label="Account is active"
              />
            )}
          />
        </FormField>
      )}
    </Stack>
  )
}
