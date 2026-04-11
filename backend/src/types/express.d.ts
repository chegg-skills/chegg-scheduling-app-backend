import type { UserRole } from '@prisma/client'

declare global {
  namespace Express {
    interface Request {
      requestId?: string
    }

    interface Locals {
      requestId?: string
      authUser?: {
        id: string
        email: string
        role: UserRole
      }
    }
  }
}

export {}
