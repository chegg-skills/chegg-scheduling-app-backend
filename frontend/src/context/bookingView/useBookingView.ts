import { useContext } from 'react'
import { BookingViewContext } from './BookingViewContext'

export function useBookingView() {
  return useContext(BookingViewContext)
}
