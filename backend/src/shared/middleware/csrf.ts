import { timingSafeEqual } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { ErrorHandler } from '../error/errorhandler'
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '../utils/cookie'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const csrfProtectionEnabled = process.env.ENABLE_CSRF_PROTECTION === 'true'

const matchesToken = (cookieToken: string, headerToken: string): boolean => {
  const cookieBuffer = Buffer.from(cookieToken)
  const headerBuffer = Buffer.from(headerToken)

  if (cookieBuffer.length !== headerBuffer.length) {
    return false
  }

  return timingSafeEqual(cookieBuffer, headerBuffer)
}

export const csrfProtection = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (!csrfProtectionEnabled || SAFE_METHODS.has(req.method)) {
    next()
    return
  }

  const authCookie = req.cookies?.[AUTH_COOKIE_NAME]
  if (typeof authCookie !== 'string' || authCookie.length === 0) {
    next()
    return
  }

  const csrfCookie = req.cookies?.[CSRF_COOKIE_NAME]
  const csrfHeader = req.get(CSRF_HEADER_NAME) ?? req.get('x-xsrf-token')

  if (
    typeof csrfCookie !== 'string' ||
    csrfCookie.length === 0 ||
    typeof csrfHeader !== 'string' ||
    csrfHeader.length === 0 ||
    !matchesToken(csrfCookie, csrfHeader)
  ) {
    next(new ErrorHandler(StatusCodes.FORBIDDEN, 'Invalid CSRF token.'))
    return
  }

  next()
}
