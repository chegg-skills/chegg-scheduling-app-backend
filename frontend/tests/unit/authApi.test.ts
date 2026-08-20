import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { authApi } from '@/api/auth'

import { server } from '../msw/server'

const pathIs = (pathname: string) => (({ request }: { request: Request }) =>
  new URL(request.url).pathname === pathname)

describe('authApi.logout', () => {
  it('sends no request body', async () => {
    // Regression test: authApi.logout() used to pass `null` as the axios body,
    // which serializes to the JSON literal "null". express.json()'s strict mode
    // only accepts a top-level object or array, so the server 400'd on every
    // logout — and AuthProvider.logout() had no catch, only finally, so the
    // failure was invisible: the UI looked logged out while the session cookie
    // was never touched server-side. `undefined` sends no body at all.
    let receivedBody: string | null = null

    server.use(
      http.post(pathIs('/api/auth/logout'), async ({ request }) => {
        receivedBody = await request.text()
        return HttpResponse.json({ success: true, data: { message: 'ok' } })
      })
    )

    const res = await authApi.logout()

    expect(receivedBody).toBe('')
    expect(res.status).toBe(200)
  })
})
