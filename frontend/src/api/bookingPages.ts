import apiClient from '@/lib/axios'
import type {
  ApiResponse,
  BookingPage,
  CreateBookingPageDto,
  UpdateBookingPageDto,
  AddBookingPageSectionDto,
  AddBookingPageTeamDto,
} from '@/types'

export interface ListBookingPagesResponse {
  bookingPages: BookingPage[]
}

export const bookingPagesApi = {
  create: (data: CreateBookingPageDto) =>
    apiClient.post<ApiResponse<{ bookingPage: BookingPage }>>('/booking-pages', data),

  list: (signal?: AbortSignal) =>
    apiClient.get<ApiResponse<ListBookingPagesResponse>>('/booking-pages', { signal }),

  getById: (pageId: string, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<{ bookingPage: BookingPage }>>(`/booking-pages/${pageId}`, {
      signal,
    }),

  update: (pageId: string, data: UpdateBookingPageDto) =>
    apiClient.patch<ApiResponse<{ bookingPage: BookingPage }>>(`/booking-pages/${pageId}`, data),

  delete: (pageId: string) => apiClient.delete<ApiResponse<void>>(`/booking-pages/${pageId}`),

  addSection: (pageId: string, data: AddBookingPageSectionDto) =>
    apiClient.post<ApiResponse<{ bookingPage: BookingPage }>>(
      `/booking-pages/${pageId}/sections`,
      data
    ),

  removeSection: (pageId: string, sectionId: string) =>
    apiClient.delete<ApiResponse<{ bookingPage: BookingPage }>>(
      `/booking-pages/${pageId}/sections/${sectionId}`
    ),

  addTeamToSection: (pageId: string, sectionId: string, data: AddBookingPageTeamDto) =>
    apiClient.post<ApiResponse<{ bookingPage: BookingPage }>>(
      `/booking-pages/${pageId}/sections/${sectionId}/teams`,
      data
    ),

  removeTeamFromSection: (pageId: string, sectionId: string, teamId: string) =>
    apiClient.delete<ApiResponse<{ bookingPage: BookingPage }>>(
      `/booking-pages/${pageId}/sections/${sectionId}/teams/${teamId}`
    ),
}
