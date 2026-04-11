import { type NextFunction, type Request, type Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { sendSuccessResponse } from '../../shared/utils/helper/responseHelper'
import type { CallerContext } from '../../shared/utils/userUtils'
import * as statsService from './stats.service'

export const getBookingStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext
    const data = await statsService.getBookingStats(caller, req.query.timeframe as string)
    sendSuccessResponse(res, StatusCodes.OK, data, 'Booking stats fetched successfully.')
  } catch (error) {
    next(error)
  }
}

export const getUserStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext
    const data = await statsService.getUserStats(caller, req.query.timeframe as string)
    sendSuccessResponse(res, StatusCodes.OK, data, 'User stats fetched successfully.')
  } catch (error) {
    next(error)
  }
}

export const getTeamStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext
    const data = await statsService.getTeamStats(caller, req.query.timeframe as string)
    sendSuccessResponse(res, StatusCodes.OK, data, 'Team stats fetched successfully.')
  } catch (error) {
    next(error)
  }
}

export const getEventStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext
    const data = await statsService.getEventStats(caller, req.query.timeframe as string, req.query.teamId as string)
    sendSuccessResponse(res, StatusCodes.OK, data, 'Event stats fetched successfully.')
  } catch (error) {
    next(error)
  }
}

export const getOfferingStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext
    const data = await statsService.getOfferingStats(caller, req.query.timeframe as string)
    sendSuccessResponse(res, StatusCodes.OK, data, 'Offering stats fetched successfully.')
  } catch (error) {
    next(error)
  }
}

export const getInteractionTypeStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext
    const data = await statsService.getInteractionTypeStats(caller, req.query.timeframe as string)
    sendSuccessResponse(res, StatusCodes.OK, data, 'Interaction type stats fetched successfully.')
  } catch (error) {
    next(error)
  }
}

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext
    const data = await statsService.getDashboardStats(caller, req.query.timeframe as string)
    sendSuccessResponse(res, StatusCodes.OK, data, 'Dashboard stats fetched successfully.')
  } catch (error) {
    next(error)
  }
}

export const getBookingTrends = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext
    const data = await statsService.getBookingTrends(caller, req.query.timeframe as string)
    sendSuccessResponse(res, StatusCodes.OK, data, 'Booking trends fetched successfully.')
  } catch (error) {
    next(error)
  }
}

export const getTeamPerformance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext
    const data = await statsService.getTeamPerformance(caller, req.query.timeframe as string)
    sendSuccessResponse(res, StatusCodes.OK, data, 'Team performance stats fetched successfully.')
  } catch (error) {
    next(error)
  }
}

export const getPeakActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext
    const data = await statsService.getPeakActivity(caller, req.query.timeframe as string)
    sendSuccessResponse(res, StatusCodes.OK, data, 'Peak activity stats fetched successfully.')
  } catch (error) {
    next(error)
  }
}


