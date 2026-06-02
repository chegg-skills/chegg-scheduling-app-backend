import axios from 'axios'

/**
 * Extracts a user-facing error message from any thrown value.
 *
 * Priority for Axios errors: `response.data.message` → `response.data.error`
 * → `error.message`. Falls back to a generic string for non-Axios errors and
 * non-Error objects so callers always receive a displayable string.
 *
 * @param error - The caught value from a try/catch or React Query `onError`.
 * @returns A human-readable error message, never `undefined`.
 */
export function extractApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message || error.response?.data?.error || error.message
    if (typeof msg === 'string') return msg
  }
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred.'
}

/**
 * Returns the HTTP status code from an Axios error, or `undefined` for any
 * other error type. Useful for branching on specific status codes (e.g. 401,
 * 409) without importing axios in every hook.
 *
 * @param error - The caught value from a try/catch or React Query `onError`.
 * @returns The HTTP status code number, or `undefined` if the error is not an Axios error.
 */
export function getApiStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) {
    return error.response?.status
  }
  return undefined
}
