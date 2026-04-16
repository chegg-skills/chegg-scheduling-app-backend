import { createContext, useContext } from 'react'

interface BookingViewContextValue {
  onViewHost?: (userId: string) => void
}

const BookingViewContext = createContext<BookingViewContextValue>({})

export const BookingViewProvider = BookingViewContext.Provider

export function useBookingView() {
  return useContext(BookingViewContext)
}
