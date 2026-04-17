import axios from 'axios'

export function extractApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message || error.response?.data?.error || error.message
    if (typeof msg === 'string') return msg
  }
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred.'
}

export function getApiStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) {
    return error.response?.status
  }
  return undefined
}
