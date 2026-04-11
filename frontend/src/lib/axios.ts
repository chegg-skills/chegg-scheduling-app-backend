import axios from 'axios'

const CSRF_COOKIE_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'

export const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (!envUrl) return '/api'
  return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`
}

const getCookieValue = (name: string): string | undefined => {
  if (typeof document === 'undefined') {
    return undefined
  }

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`))

  if (!cookie) {
    return undefined
  }

  return decodeURIComponent(cookie.slice(name.length + 1))
}

const apiClient = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const method = config.method?.toLowerCase()
  const isSafeMethod = method === undefined || ['get', 'head', 'options'].includes(method)

  if (!isSafeMethod) {
    const csrfToken = getCookieValue(CSRF_COOKIE_NAME)
    if (csrfToken) {
      config.headers = config.headers ?? {}
      config.headers[CSRF_HEADER_NAME] = csrfToken
    }
  }

  return config
})

// Redirect to login on 401 without creating a circular dependency on AuthContext
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      const pathname = window.location.pathname
      const isPublicRoute =
        pathname.startsWith('/login') ||
        pathname.startsWith('/register') ||
        pathname.startsWith('/bootstrap') ||
        pathname.startsWith('/accept-invite') ||
        pathname.startsWith('/book') ||
        pathname.startsWith('/reschedule')

      if (!isPublicRoute) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default apiClient
