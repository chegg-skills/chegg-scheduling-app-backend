import crypto from 'crypto'

const MAX_BASE_LENGTH = 48

export const slugifyPublicBookingLabel = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_BASE_LENGTH)
}

export const createPublicBookingSlug = (value: string, fallback = 'booking'): string => {
  const base = slugifyPublicBookingLabel(value) || fallback
  const suffix = crypto.randomBytes(3).toString('hex')
  return `${base}-${suffix}`
}
