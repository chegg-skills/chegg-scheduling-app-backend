import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import * as BookingService from "./booking.service";
import { BookingStatus, UserRole } from "@prisma/client";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { CallerContext } from "../../shared/utils/userUtils";
import type { ListBookingsFilters } from "./booking.shared";

const getStringParam = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
};

export const createBooking = async (req: Request, res: Response) => {
  const booking = await BookingService.createBooking(req.body);

  return sendSuccessResponse(
    res,
    StatusCodes.CREATED,
    { booking },
    "Booking confirmed successfully.",
  );
};

export const getBooking = async (req: Request, res: Response) => {
  const bookingId = req.params.bookingId as string;
  const caller = res.locals.authUser as CallerContext;
  const booking = await BookingService.getBooking(bookingId);

  if (caller.role === UserRole.COACH) {
    const isLead = booking.coachUserId === caller.id;
    const isCoHost = (booking.coCoachUserIds ?? []).includes(caller.id);

    if (!isLead && !isCoHost) {
      throw new ErrorHandler(StatusCodes.FORBIDDEN, "You are not authorized to view this booking.");
    }
  }

  return sendSuccessResponse(res, StatusCodes.OK, { booking }, "Booking fetched successfully.");
};

export const listBookings = async (req: Request, res: Response) => {
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

export const updateBooking = async (req: Request, res: Response) => {
  const bookingId = req.params.bookingId as string;
  const { status, coCoachUserIds } = req.body;
  const booking = await BookingService.updateBooking(bookingId, { status, coCoachUserIds });

  return sendSuccessResponse(res, StatusCodes.OK, { booking }, "Booking updated successfully.");
};

export const rescheduleBooking = async (req: Request, res: Response) => {
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
  });

  return sendSuccessResponse(res, StatusCodes.OK, { booking }, "Booking rescheduled successfully.");
};
