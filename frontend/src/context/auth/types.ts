import type { SafeUser } from '@/types'

export interface AuthContextValue {
  user: SafeUser | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: SafeUser | null) => void
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}
