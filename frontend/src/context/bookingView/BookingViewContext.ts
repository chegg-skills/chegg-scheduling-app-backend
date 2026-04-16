import { createContext } from 'react'
import type { BookingViewContextValue } from './types'

export const BookingViewContext = createContext<BookingViewContextValue>({})
