import axios from 'axios'

const CSRF_HEADER_NAME = 'x-csrf-token'
const CSRF_STORAGE_KEY = 'csrf_token'

export const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (!envUrl) return '/api'
  return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`
}

// In-memory primary; localStorage backs it across page reloads
let csrfMemory: string | null = (() => {
  try {
    return localStorage.getItem(CSRF_STORAGE_KEY)
  } catch {
    return null
  }
})()

export const storeCsrfToken = (token: string): void => {
  csrfMemory = token
  try {
    localStorage.setItem(CSRF_STORAGE_KEY, token)
  } catch {
    // localStorage unavailable (private browsing restrictions) — memory-only is fine
  }
}

export const clearCsrfToken = (): void => {
  csrfMemory = null
  try {
    localStorage.removeItem(CSRF_STORAGE_KEY)
  } catch {
    // ignore
  }
}

const apiClient = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((req) => {
  const method = req.method?.toLowerCase()
  const isSafeMethod = method === undefined || ['get', 'head', 'options'].includes(method)

  if (!isSafeMethod && csrfMemory) {
    req.headers = req.headers ?? {}
    req.headers[CSRF_HEADER_NAME] = csrfMemory
  }

  return req
})

// Auto-store csrfToken from any response body; redirect to login on 401
apiClient.interceptors.response.use(
  (res) => {
    const token = res.data?.data?.csrfToken
    if (token && typeof token === 'string') storeCsrfToken(token)
    return res
  },
  (error) => {
    if (error.response?.status === 401) {
      const pathname = window.location.pathname
      const isPublicRoute =
        pathname.startsWith('/login') ||
        pathname.startsWith('/register') ||
        pathname.startsWith('/bootstrap') ||
        pathname.startsWith('/accept-invite') ||
        pathname.startsWith('/book') ||
        pathname.startsWith('/reschedule') ||
        pathname.startsWith('/cancel')

      if (!isPublicRoute) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
