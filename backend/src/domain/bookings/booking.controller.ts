import { Request, Response } from "express";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/http/responseHelper";
import * as BookingService from "./booking.service";
import * as BookingSessionLogService from "./bookingSessionLog.service";
import * as BookingActivityService from "./bookingActivity.service";
import { BookingStatus, UserRole } from "@prisma/client";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { CallerContext } from "../../shared/utils/userUtils";
import type { ListBookingsFilters } from "./booking.shared";
import { prisma } from "../../shared/db/prisma";

const getStringParam = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
};

const createBooking = async (req: Request, res: Response) => {
  const booking = await BookingService.createBooking(req.body);

  return sendSuccessResponse(
    res,
    StatusCodes.CREATED,
    { booking },
    "Booking confirmed successfully.",
  );
};

const getBooking = async (req: Request, res: Response) => {
  const bookingId = req.params.bookingId as string;
  const caller = res.locals.authUser as CallerContext;
  const booking = await BookingService.getBooking(bookingId);

  if (caller.role === UserRole.COACH) {
    const isLead = booking.coachUserId != null && booking.coachUserId === caller.id;
    const isCoHost = (booking.coCoachUserIds ?? []).includes(caller.id);

    if (!isLead && !isCoHost) {
      throw new ErrorHandler(StatusCodes.FORBIDDEN, "You are not authorized to view this booking.");
    }
  }

  if (caller.role === UserRole.TEAM_ADMIN) {
    const memberCount = await prisma.team.count({
      where: {
        id: booking.teamId,
        OR: [
          { teamLeadId: caller.id },
          { members: { some: { userId: caller.id, isActive: true } } },
        ],
      },
    });
    if (memberCount === 0) {
      throw new ErrorHandler(StatusCodes.FORBIDDEN, "You are not authorized to view this booking.");
    }
  }

  return sendSuccessResponse(res, StatusCodes.OK, { booking }, "Booking fetched successfully.");
};

const listBookings = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;

  const filters: ListBookingsFilters = {
    teamId: getStringParam(req.query.teamId),
    eventId: getStringParam(req.query.eventId),
    coachUserId: caller.role === UserRole.COACH ? caller.id : getStringParam(req.query.coachUserId),
    status: getStringParam(req.query.status) as BookingStatus | undefined,
    search: getStringParam(req.query.search),
    startDate: getStringParam(req.query.startDate),
    endDate: getStringParam(req.query.endDate),
    teamAdminCallerId: caller.role === UserRole.TEAM_ADMIN ? caller.id : undefined,
    page,
    limit,
  };

  const { bookings, totalCount } = await BookingService.listBookings(filters);
  const resolvedLimit = limit ?? 10;

  return sendSuccessResponse(
    res,
    StatusCodes.OK,
    {
      bookings,
      pagination: {
        total: totalCount,
        page: page ?? 1,
        pageSize: resolvedLimit,
        totalPages: Math.ceil(totalCount / resolvedLimit) || 1,
      },
    },
    "Bookings fetched successfully.",
  );
};

const updateBooking = async (req: Request, res: Response) => {
  const bookingId = req.params.bookingId as string;
  const { status, coCoachUserIds, cancellationReason } = req.body;
  const caller = res.locals.authUser as CallerContext;
  const booking = await BookingService.updateBooking(
    bookingId,
    {
      status,
      coCoachUserIds,
      cancellationReason,
    },
    caller,
  );

  return sendSuccessResponse(res, StatusCodes.OK, { booking }, "Booking updated successfully.");
};

const rescheduleBooking = async (req: Request, res: Response) => {
  const bookingId = req.params.bookingId as string;
  const { startTime, timezone, token } = req.body;
  const caller = res.locals.authUser as CallerContext | undefined;

  if (!caller && !token) {
    throw new ErrorHandler(
      StatusCodes.UNAUTHORIZED,
      "Authentication or reschedule token is required.",
    );
  }

  const booking = await BookingService.rescheduleBooking(bookingId, {
    startTime,
    timezone,
    token,
  }, caller);

  return sendSuccessResponse(res, StatusCodes.OK, { booking }, "Booking rescheduled successfully.");
};

const getBookingSessionLog = async (req: Request, res: Response) => {
  const bookingId = req.params.bookingId as string;
  const caller = res.locals.authUser as CallerContext;

  const log = await BookingSessionLogService.getBookingSessionLog(bookingId, caller);

  return sendSuccessResponse(res, StatusCodes.OK, log, "Booking session log fetched successfully.");
};

const upsertBookingSessionLog = async (req: Request, res: Response) => {
  const bookingId = req.params.bookingId as string;
  const caller = res.locals.authUser as CallerContext;

  const log = await BookingSessionLogService.upsertBookingSessionLog(bookingId, req.body, caller);

  return sendSuccessResponse(res, StatusCodes.OK, log, "Booking session log saved successfully.");
};

const cancelBooking = async (req: Request, res: Response) => {
  const bookingId = req.params.bookingId as string;
  const { token, cancellationReason } = req.body;
  const caller = res.locals.authUser as CallerContext | undefined;

  if (!caller && !token) {
    throw new ErrorHandler(StatusCodes.UNAUTHORIZED, "Authentication or cancel token is required.");
  }

  if (caller && !token) {
    if (
      caller.role !== UserRole.SUPER_ADMIN &&
      caller.role !== UserRole.TEAM_ADMIN &&
      caller.role !== UserRole.COACH
    ) {
      throw new ErrorHandler(StatusCodes.FORBIDDEN, "You are not authorized to cancel bookings.");
    }
  }

  const booking = await BookingService.cancelBooking(
    bookingId,
    { token, cancellationReason },
    caller,
  );

  return sendSuccessResponse(res, StatusCodes.OK, { booking }, "Booking cancelled successfully.");
};

const bookFollowUpSession = async (req: Request, res: Response) => {
  const bookingId = req.params.bookingId as string;
  const caller = res.locals.authUser as CallerContext;

  const booking = await BookingService.bookFollowUpSession(bookingId, req.body, caller);

  return sendSuccessResponse(
    res,
    StatusCodes.CREATED,
    { booking },
    "Follow-up booking confirmed successfully.",
  );
};

const getBookingTimeline = async (req: Request, res: Response) => {
  const { bookingId } = req.params as { bookingId: string };
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const caller = res.locals.authUser as CallerContext;

  const booking = await BookingService.getBooking(bookingId);
  await BookingActivityService.assertBookingTimelineAccess(booking, caller);

  const { activities, totalCount } = await BookingActivityService.getBookingActivities(bookingId, page, limit);

  return sendSuccessResponse(
    res,
    StatusCodes.OK,
    {
      activities,
      pagination: {
        total: totalCount,
        page,
        pageSize: limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    },
    "Booking timeline activities fetched successfully.",
  );
};

export default {
  createBooking: asyncHandler(createBooking),
  getBooking: asyncHandler(getBooking),
  listBookings: asyncHandler(listBookings),
  updateBooking: asyncHandler(updateBooking),
  rescheduleBooking: asyncHandler(rescheduleBooking),
  getBookingSessionLog: asyncHandler(getBookingSessionLog),
  upsertBookingSessionLog: asyncHandler(upsertBookingSessionLog),
  cancelBooking: asyncHandler(cancelBooking),
  bookFollowUpSession: asyncHandler(bookFollowUpSession),
  getBookingTimeline: asyncHandler(getBookingTimeline),
};
