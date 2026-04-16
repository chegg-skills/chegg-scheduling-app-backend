import { createContext } from 'react'
import type { ConfirmContextType } from './types'

export const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined)
