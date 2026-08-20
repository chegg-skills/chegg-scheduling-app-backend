import * as Sentry from '@sentry/react'
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

/**
 * The `csrf_token` cookie is intentionally readable by JS, and it — not our stored
 * copy — is what the server compares against. Reading it directly covers the cases
 * where the stored copy is missing or stale: cleared localStorage, a token rotated
 * by another tab, and SSO logins (which redirect rather than returning a JSON body,
 * so the response interceptor never sees a token to store).
 */
const readCsrfCookie = (): string | null => {
  try {
    const match = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith(`${CSRF_STORAGE_KEY}=`))

    return match ? decodeURIComponent(match.slice(CSRF_STORAGE_KEY.length + 1)) : null
  } catch {
    return null
  }
}

/** Cookie wins over the stored copy — the server validates against the cookie. */
const getCsrfToken = (): string | null => readCsrfCookie() ?? csrfMemory

const apiClient = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((req) => {
  const method = req.method?.toLowerCase()
  const isSafeMethod = method === undefined || ['get', 'head', 'options'].includes(method)

  const csrfToken = !isSafeMethod ? getCsrfToken() : null
  if (csrfToken) {
    req.headers = req.headers ?? {}
    req.headers[CSRF_HEADER_NAME] = csrfToken
  }

  return req
})

const isPublicRoute = (pathname: string): boolean =>
  pathname.startsWith('/login') ||
  pathname.startsWith('/register') ||
  pathname.startsWith('/bootstrap') ||
  pathname.startsWith('/accept-invite') ||
  pathname.startsWith('/book') ||
  pathname.startsWith('/reschedule') ||
  pathname.startsWith('/cancel')

// Endpoints that establish or end a session themselves. A 401 from one of these
// is the real answer, not an expired access token, so refresh must not fire —
// refreshing on /auth/refresh's own 401 would recurse.
const SESSION_ENDPOINTS = ['/auth/refresh', '/auth/login', '/auth/logout', '/auth/bootstrap', '/auth/register']

const isSessionEndpoint = (url: string | undefined): boolean =>
  !!url && SESSION_ENDPOINTS.some((endpoint) => url.includes(endpoint))

/**
 * Shared across all concurrent 401s so a page that fires several requests at once
 * performs a single refresh rather than one per failed request.
 */
let refreshPromise: Promise<void> | null = null

const refreshSession = (): Promise<void> => {
  refreshPromise =
    refreshPromise ??
    apiClient
      .post('/auth/refresh')
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null
      })

  return refreshPromise
}

/**
 * Only an authentication verdict means the session is unrecoverable. A rate limit,
 * a server error or a dropped connection says nothing about the session's validity,
 * so those must not trigger a logout — a busy shared network would otherwise sign
 * everyone out mid-session.
 */
const isSessionRejected = (error: unknown): boolean => {
  const status = (error as { response?: { status?: number } })?.response?.status
  return status === 401 || status === 403
}

const redirectToLogin = (): void => {
  clearCsrfToken()
  window.location.href = '/login'
}

// Auto-store csrfToken from any response body; on 401 try a silent refresh and
// replay the original request; on a CSRF 403 re-sync from the cookie and retry once.
apiClient.interceptors.response.use(
  (res) => {
    const token = res.data?.data?.csrfToken
    if (token && typeof token === 'string') storeCsrfToken(token)
    return res
  },
  async (error) => {
    const status = error.response?.status
    if (!status || status >= 500) {
      Sentry.captureException(error)
    }

    const original = error.config

    if (status === 401 && original && !original._retried && !isSessionEndpoint(original.url)) {
      // Public pages authenticate per-request (e.g. the one-time reschedule token),
      // so there is no session to refresh and a 401 there is final.
      if (!isPublicRoute(window.location.pathname)) {
        try {
          await refreshSession()
          original._retried = true
          return apiClient(original)
        } catch (refreshError) {
          // Only give up the session when the refresh was actually rejected;
          // a transient failure leaves the session intact.
          if (isSessionRejected(refreshError)) {
            if (!isPublicRoute(window.location.pathname)) redirectToLogin()
          }
          return Promise.reject(error)
        }
      }
    }

    // A stale CSRF token fails the double-submit check. The cookie is authoritative,
    // so re-read it and retry once before treating this as a dead session.
    if (status === 403 && original && !original._csrfRetried) {
      const cookieToken = readCsrfCookie()
      if (cookieToken && cookieToken !== csrfMemory) {
        storeCsrfToken(cookieToken)
        original._csrfRetried = true
        return apiClient(original)
      }
    }

    if (status === 401 && !isPublicRoute(window.location.pathname)) {
      redirectToLogin()
    }

    return Promise.reject(error)
  }
)

export default apiClient
