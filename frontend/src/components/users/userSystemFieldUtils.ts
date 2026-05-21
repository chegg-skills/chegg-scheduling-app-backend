import type { UserRole } from '@/types'
import type { TimezoneOption } from '@/api/config'

export const USER_ROLES: UserRole[] = ['SUPER_ADMIN', 'TEAM_ADMIN', 'COACH']

export const GROUP_ORDER = [
  'US/Canada',
  'America',
  'Africa',
  'Asia',
  'Atlantic',
  'Australia',
  'UTC',
  'Europe',
  'Pacific',
  'Universal',
]

export function getTimezoneInfo(timezone: string, date: Date) {
  try {
    const time = date
      .toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      })
      .replace(/\s/g, '')
      .toLowerCase()

    const name =
      new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'long',
      })
        .formatToParts(date)
        .find((part) => part.type === 'timeZoneName')?.value || timezone

    return { time, name }
  } catch {
    return { time: '', name: timezone }
  }
}

export function groupTimezonesByRegion(
  timezones: TimezoneOption[]
): Record<string, TimezoneOption[]> {
  return timezones.reduce<Record<string, TimezoneOption[]>>((groups, tz) => {
    if (!groups[tz.group]) {
      groups[tz.group] = []
    }
    groups[tz.group].push(tz)
    return groups
  }, {})
}

export function formatTimezoneLabel(iana: string, timezones: TimezoneOption[] = []): string {
  if (!iana) return ''
  const match = timezones.find((tz) => tz.iana === iana)
  if (match) return match.label
  return getTimezoneInfo(iana, new Date()).name || iana.replace(/_/g, ' ')
}
