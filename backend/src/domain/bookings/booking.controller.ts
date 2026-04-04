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
} from "./booking.notification";

const getStringParam = (value: unknown): string | undefined => {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    return undefined;
};


export const createBooking = async (req: Request, res: Response) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Booking details are required.");
    }
    const booking = await BookingService.createBooking(req.body);
    void queueBookingCreatedNotifications(booking);

    return sendSuccessResponse(
        res,
        StatusCodes.CREATED,
        { booking },
        "Booking confirmed successfully."
    );
};

export const getBooking = async (req: Request, res: Response) => {
    const id = getStringParam(req.params.id);
    if (!id) {
        throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Booking ID is required.");
    }
    const caller = res.locals.authUser as CallerContext;
    const booking = await BookingService.getBooking(id);

    if (caller.role === UserRole.COACH && booking.hostUserId !== caller.id) {
        throw new ErrorHandler(StatusCodes.FORBIDDEN, "You are not authorized to view this booking.");
    }

    return sendSuccessResponse(
        res,
        StatusCodes.OK,
        { booking },
        "Booking fetched successfully."
    );
};

export const listBookings = async (req: Request, res: Response) => {
    const { teamId, eventId, hostUserId, status, search } = req.query;
    const caller = res.locals.authUser as CallerContext;

    let targetHostId = getStringParam(hostUserId);
    let targetTeamId = getStringParam(teamId);

    if (caller.role === UserRole.COACH) {
        targetHostId = caller.id;
    }

    const bookings = await BookingService.listBookings({
        teamId: targetTeamId,
        eventId: getStringParam(eventId),
        hostUserId: targetHostId,
        status: status as BookingStatus | undefined,
        search: getStringParam(search)
    });

    return sendSuccessResponse(
        res,
        StatusCodes.OK,
        { bookings },
        "Bookings fetched successfully."
    );
};

export const updateBookingStatus = async (req: Request, res: Response) => {
    const id = getStringParam(req.params.id);
    if (!id) {
        throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Booking ID is required.");
    }
    const { status } = req.body;
    const booking = await BookingService.updateBookingStatus(id, status as BookingStatus);
    void queueBookingStatusNotifications(booking);

    return sendSuccessResponse(
        res,
        StatusCodes.OK,
        { booking },
        "Booking status updated successfully."
    );
};
