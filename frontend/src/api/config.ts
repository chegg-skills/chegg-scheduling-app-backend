import apiClient from '@/lib/axios'
import type { ApiResponse } from '@/types'

export interface TimezoneOption {
  iana: string
  label: string
  group: string
}

export interface TimezonesResponse {
  timezones: TimezoneOption[]
}

export interface CountriesResponse {
  countries: Array<{ code: string; name: string }>
}

export interface LanguagesResponse {
  languages: Array<{ code: string; name: string }>
}

export const configApi = {
  getTimezones: (signal?: AbortSignal) =>
    apiClient.get<ApiResponse<TimezonesResponse>>('/config/timezones', { signal }),
  getCountries: (signal?: AbortSignal) =>
    apiClient.get<ApiResponse<CountriesResponse>>('/config/countries', { signal }),
  getLanguages: (signal?: AbortSignal) =>
    apiClient.get<ApiResponse<LanguagesResponse>>('/config/languages', { signal }),
}
