import apiClient from '@/lib/axios'
import type {
  ApiResponse,
  BookingDirectory,
  CreateBookingDirectoryDto,
  UpdateBookingDirectoryDto,
  AddBookingDirectorySectionDto,
  AddBookingDirectoryTeamDto,
} from '@/types'

export interface ListBookingDirectoriesResponse {
  bookingDirectories: BookingDirectory[]
}

export const bookingDirectoriesApi = {
  create: (data: CreateBookingDirectoryDto) =>
    apiClient.post<ApiResponse<{ bookingDirectory: BookingDirectory }>>('/booking-directories', data),

  list: (signal?: AbortSignal) =>
    apiClient.get<ApiResponse<ListBookingDirectoriesResponse>>('/booking-directories', { signal }),

  getById: (directoryId: string, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<{ bookingDirectory: BookingDirectory }>>(`/booking-directories/${directoryId}`, {
      signal,
    }),

  update: (directoryId: string, data: UpdateBookingDirectoryDto) =>
    apiClient.patch<ApiResponse<{ bookingDirectory: BookingDirectory }>>(`/booking-directories/${directoryId}`, data),

  delete: (directoryId: string) => apiClient.delete<ApiResponse<void>>(`/booking-directories/${directoryId}`),

  addSection: (directoryId: string, data: AddBookingDirectorySectionDto) =>
    apiClient.post<ApiResponse<{ bookingDirectory: BookingDirectory }>>(
      `/booking-directories/${directoryId}/sections`,
      data
    ),

  removeSection: (directoryId: string, sectionId: string) =>
    apiClient.delete<ApiResponse<{ bookingDirectory: BookingDirectory }>>(
      `/booking-directories/${directoryId}/sections/${sectionId}`
    ),

  addTeamToSection: (directoryId: string, sectionId: string, data: AddBookingDirectoryTeamDto) =>
    apiClient.post<ApiResponse<{ bookingDirectory: BookingDirectory }>>(
      `/booking-directories/${directoryId}/sections/${sectionId}/teams`,
      data
    ),

  removeTeamFromSection: (directoryId: string, sectionId: string, teamId: string) =>
    apiClient.delete<ApiResponse<{ bookingDirectory: BookingDirectory }>>(
      `/booking-directories/${directoryId}/sections/${sectionId}/teams/${teamId}`
    ),
}
