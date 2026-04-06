import type { UserRole } from '@/types'

export const USER_ROLES: UserRole[] = ['SUPER_ADMIN', 'TEAM_ADMIN', 'COACH']

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

export function groupTimezonesByRegion(timezones: string[]) {
  return timezones.reduce<Record<string, string[]>>((groups, timezone) => {
    const region = timezone.includes('/') ? timezone.split('/')[0].replace(/_/g, ' ') : 'Universal'

    if (!groups[region]) {
      groups[region] = []
    }

    groups[region].push(timezone)
    return groups
  }, {})
}
