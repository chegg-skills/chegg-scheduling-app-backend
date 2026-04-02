import { type NextFunction, type Request, type Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { sendSuccessResponse } from '../../shared/utils/helper/responseHelper'
import type { CallerContext } from '../../shared/utils/userUtils'
import * as statsService from './stats.service'

const getTimeframeParam = (req: Request): string | undefined => {
  return typeof req.query.timeframe === 'string' ? req.query.timeframe : undefined
}

const getTeamIdParam = (req: Request): string | undefined => {
  return typeof req.query.teamId === 'string' ? req.query.teamId.trim() : undefined
}

export const getBookingStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext
    const data = await statsService.getBookingStats(caller, getTimeframeParam(req))
    sendSuccessResponse(res, StatusCodes.OK, data, 'Booking stats fetched successfully.')
  } catch (error) {
    next(error)
  }
}

export const getUserStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext
    const data = await statsService.getUserStats(caller, getTimeframeParam(req))
    sendSuccessResponse(res, StatusCodes.OK, data, 'User stats fetched successfully.')
  } catch (error) {
    next(error)
  }
}

export const getTeamStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext
    const data = await statsService.getTeamStats(caller, getTimeframeParam(req))
    sendSuccessResponse(res, StatusCodes.OK, data, 'Team stats fetched successfully.')
  } catch (error) {
    next(error)
  }
}

export const getEventStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext
    const data = await statsService.getEventStats(caller, getTimeframeParam(req), getTeamIdParam(req))
    sendSuccessResponse(res, StatusCodes.OK, data, 'Event stats fetched successfully.')
  } catch (error) {
    next(error)
  }
}

export const getOfferingStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext
    const data = await statsService.getOfferingStats(caller, getTimeframeParam(req))
    sendSuccessResponse(res, StatusCodes.OK, data, 'Offering stats fetched successfully.')
  } catch (error) {
    next(error)
  }
}

export const getInteractionTypeStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext
    const data = await statsService.getInteractionTypeStats(caller, getTimeframeParam(req))
    sendSuccessResponse(res, StatusCodes.OK, data, 'Interaction type stats fetched successfully.')
  } catch (error) {
    next(error)
  }
}

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext
    const data = await statsService.getDashboardStats(caller, getTimeframeParam(req))
    sendSuccessResponse(res, StatusCodes.OK, data, 'Dashboard stats fetched successfully.')
  } catch (error) {
    next(error)
  }
}
