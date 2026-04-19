import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import * as BookingService from "./booking.service";
import { BookingStatus, UserRole } from "@prisma/client";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { CallerContext } from "../../shared/utils/userUtils";
import {
  queueBookingCreatedNotifications,
  queueBookingStatusNotifications,
  queueBookingUpdatedNotifications,
  queueBookingRescheduledNotifications,
} from "./booking.notification";

const getStringParam = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
};

export const createBooking = async (req: Request, res: Response) => {
  const booking = await BookingService.createBooking(req.body);
  void queueBookingCreatedNotifications(booking);

  return sendSuccessResponse(
    res,
    StatusCodes.CREATED,
    { booking },
    "Booking confirmed successfully.",
  );
};

export const getBooking = async (req: Request, res: Response) => {
  const { bookingId } = req.params as any;
  const caller = res.locals.authUser as CallerContext;
  const booking = await BookingService.getBooking(bookingId);

  if (caller.role === UserRole.COACH) {
    const isLead = booking.coachUserId === caller.id;
    const isCoHost = ((booking as any).coCoachUserIds || []).includes(caller.id);

    if (!isLead && !isCoHost) {
      throw new ErrorHandler(StatusCodes.FORBIDDEN, "You are not authorized to view this booking.");
    }
  }

  return sendSuccessResponse(res, StatusCodes.OK, { booking }, "Booking fetched successfully.");
};

export const listBookings = async (req: Request, res: Response) => {
  const filters = req.query as any;
  const caller = res.locals.authUser as CallerContext;

  if (caller.role === UserRole.COACH) {
    filters.coachUserId = caller.id;
  }

  const { bookings, totalCount } = await BookingService.listBookings(filters);

  return sendSuccessResponse(
    res,
    StatusCodes.OK,
    {
      bookings,
      pagination: {
        total: totalCount,
        page: filters.page,
        pageSize: filters.pageSize || filters.limit,
        totalPages: Math.ceil(totalCount / (filters.pageSize || filters.limit)),
      },
    },
    "Bookings fetched successfully.",
  );
};

export const updateBooking = async (req: Request, res: Response) => {
  const { bookingId } = req.params as any;
  const oldBooking = await BookingService.getBooking(bookingId);
  const { status, coCoachUserIds } = req.body;

  const booking = await BookingService.updateBooking(bookingId, {
    status,
    coCoachUserIds,
  });

  if (status && status !== oldBooking.status) {
    void queueBookingStatusNotifications(booking);
  }

  void queueBookingUpdatedNotifications(oldBooking, booking);

  return sendSuccessResponse(res, StatusCodes.OK, { booking }, "Booking updated successfully.");
};

export const rescheduleBooking = async (req: Request, res: Response) => {
  const { bookingId } = req.params as any;
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

  void queueBookingUpdatedNotifications(booking, booking);

  return sendSuccessResponse(res, StatusCodes.OK, { booking }, "Booking rescheduled successfully.");
};
