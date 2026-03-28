import apiClient from '@/lib/axios'
import type { ApiResponse } from '@/types'

export interface TimezonesResponse {
    timezones: string[]
}

export interface CountriesResponse {
    countries: Array<{ code: string; name: string }>
}

export interface LanguagesResponse {
    languages: Array<{ code: string; name: string }>
}

export const configApi = {
    getTimezones: () => apiClient.get<ApiResponse<TimezonesResponse>>('/config/timezones'),
    getCountries: () => apiClient.get<ApiResponse<CountriesResponse>>('/config/countries'),
    getLanguages: () => apiClient.get<ApiResponse<LanguagesResponse>>('/config/languages'),
}
