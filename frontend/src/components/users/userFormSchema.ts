import { z } from 'zod'
import type { SafeUser } from '@/types'

export const userFormSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Minimum 8 characters').or(z.literal('')).optional(),
  phoneNumber: z.string().optional(),
  country: z.string().optional(),
  preferredLanguage: z.string().optional(),
  role: z.enum(['SUPER_ADMIN', 'TEAM_ADMIN', 'COACH'] as const),
  timezone: z.string().optional(),
  zoomIsvLink: z
    .string()
    .optional()
    .refine((value) => {
      if (!value?.trim()) return true

      try {
        const url = new URL(value)
        return url.protocol === 'https:'
      } catch {
        return false
      }
    }, 'Enter a valid https Zoom ISV meeting link'),
  isActive: z.boolean().optional(),
})

export type UserFormValues = z.infer<typeof userFormSchema>

export function getUserFormDefaults(user: SafeUser): UserFormValues {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    password: '',
    phoneNumber: user.phoneNumber ?? '',
    country: user.country ?? '',
    preferredLanguage: user.preferredLanguage ?? 'English',
    role: user.role,
    timezone: user.timezone,
    zoomIsvLink: user.zoomIsvLink ?? '',
    isActive: user.isActive,
  }
}
