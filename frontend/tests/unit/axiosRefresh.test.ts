import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import apiClient from '@/lib/axios'

import { server } from '../msw/server'

const pathIs = (pathname: string) => (({ request }: { request: Request }) =>
  new URL(request.url).pathname === pathname)

/**
 * The interceptor reads `location.pathname` and redirects by assigning
 * `location.href`, which jsdom cannot navigate. jsdom's own Location properties
 * are non-configurable, so the whole object is swapped — and it must expose a
 * valid absolute URL, since axios and MSW resolve relative request paths
 * against it.
 */
const stubLocation = (pathname: string) => {
  const url = new URL(`http://localhost:3000${pathname}`)

  const state = {
    href: url.href,
    origin: url.origin,
    protocol: url.protocol,
    host: url.host,
    hostname: url.hostname,
    port: url.port,
    pathname: url.pathname,
    search: '',
    hash: '',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
    toString: () => state.href,
  }

  Object.defineProperty(window, 'location', {
    value: state,
    writable: true,
    configurable: true,
  })

  return state
}

describe('axios 401 → refresh → retry', () => {
  beforeEach(() => {
    stubLocation('/dashboard')
  })

  it('refreshes and replays the original request after a 401', async () => {
    let attempts = 0
    const onRefresh = vi.fn()

    server.use(
      http.get(pathIs('/api/events'), () => {
        attempts += 1
        if (attempts === 1) {
          return new HttpResponse(null, { status: 401 })
        }
        return HttpResponse.json({ success: true, data: ['replayed'] })
      }),
      http.post(pathIs('/api/auth/refresh'), () => {
        onRefresh()
        return HttpResponse.json({ success: true, data: { csrfToken: 'rotated-csrf' } })
      })
    )

    const res = await apiClient.get('/events')

    expect(onRefresh).toHaveBeenCalledTimes(1)
    expect(attempts).toBe(2)
    expect(res.data.data).toEqual(['replayed'])
  })

  it('refreshes only once for concurrent 401s', async () => {
    const onRefresh = vi.fn()
    const seen: Record<string, number> = {}

    server.use(
      http.get(pathIs('/api/events'), () => {
        seen.events = (seen.events ?? 0) + 1
        return seen.events === 1
          ? new HttpResponse(null, { status: 401 })
          : HttpResponse.json({ success: true, data: 'events' })
      }),
      http.get(pathIs('/api/bookings'), () => {
        seen.bookings = (seen.bookings ?? 0) + 1
        return seen.bookings === 1
          ? new HttpResponse(null, { status: 401 })
          : HttpResponse.json({ success: true, data: 'bookings' })
      }),
      http.post(pathIs('/api/auth/refresh'), () => {
        onRefresh()
        return HttpResponse.json({ success: true, data: { csrfToken: 'rotated-csrf' } })
      })
    )

    const [events, bookings] = await Promise.all([
      apiClient.get('/events'),
      apiClient.get('/bookings'),
    ])

    // Both requests 401'd, but they share a single in-flight refresh
    expect(onRefresh).toHaveBeenCalledTimes(1)
    expect(events.data.data).toBe('events')
    expect(bookings.data.data).toBe('bookings')
  })

  it('redirects to login when the refresh itself fails', async () => {
    const location = stubLocation('/dashboard')

    server.use(
      http.get(pathIs('/api/events'), () => new HttpResponse(null, { status: 401 })),
      http.post(pathIs('/api/auth/refresh'), () => new HttpResponse(null, { status: 401 }))
    )

    await expect(apiClient.get('/events')).rejects.toThrow()
    expect(location.href).toBe('/login')
  })

  it('does not attempt a refresh on public pages', async () => {
    stubLocation('/reschedule/abc-123')
    const onRefresh = vi.fn()

    server.use(
      http.get(pathIs('/api/events'), () => new HttpResponse(null, { status: 401 })),
      http.post(pathIs('/api/auth/refresh'), () => {
        onRefresh()
        return HttpResponse.json({ success: true, data: {} })
      })
    )

    await expect(apiClient.get('/events')).rejects.toThrow()
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('does not log the user out when the refresh is merely rate-limited', async () => {
    server.use(
      http.get(pathIs('/api/events'), () => new HttpResponse(null, { status: 401 })),
      http.post(pathIs('/api/auth/refresh'), () => new HttpResponse(null, { status: 429 }))
    )

    const location = stubLocation('/dashboard')
    const before = location.href

    await expect(apiClient.get('/events')).rejects.toThrow()

    // A shared-IP rate limit says nothing about session validity
    expect(location.href).toBe(before)
  })

  it('logs the user out when the refresh is rejected as forbidden', async () => {
    const location = stubLocation('/dashboard')

    server.use(
      http.get(pathIs('/api/events'), () => new HttpResponse(null, { status: 401 })),
      http.post(pathIs('/api/auth/refresh'), () => new HttpResponse(null, { status: 403 }))
    )

    await expect(apiClient.get('/events')).rejects.toThrow()
    expect(location.href).toBe('/login')
  })

  it('re-syncs the CSRF token from the cookie and retries once after a 403', async () => {
    document.cookie = 'csrf_token=cookie-truth'
    let attempts = 0
    let sentHeader: string | null = null

    server.use(
      http.post(pathIs('/api/events'), ({ request }) => {
        attempts += 1
        if (attempts === 1) {
          return new HttpResponse(null, { status: 403 })
        }
        sentHeader = request.headers.get('x-csrf-token')
        return HttpResponse.json({ success: true, data: 'created' })
      })
    )

    const res = await apiClient.post('/events', {})

    expect(attempts).toBe(2)
    expect(sentHeader).toBe('cookie-truth')
    expect(res.data.data).toBe('created')
  })

  it('does not refresh in response to a failed login', async () => {
    const onRefresh = vi.fn()

    server.use(
      http.post(pathIs('/api/auth/login'), () => new HttpResponse(null, { status: 401 })),
      http.post(pathIs('/api/auth/refresh'), () => {
        onRefresh()
        return HttpResponse.json({ success: true, data: {} })
      })
    )

    await expect(apiClient.post('/auth/login', {})).rejects.toThrow()
    expect(onRefresh).not.toHaveBeenCalled()
  })
})
