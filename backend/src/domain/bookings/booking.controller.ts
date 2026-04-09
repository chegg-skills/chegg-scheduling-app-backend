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

    if (caller.role === UserRole.COACH) {
        const isLead = booking.hostUserId === caller.id;
        const isCoHost = ((booking as any).coHostUserIds || []).includes(caller.id);

        if (!isLead && !isCoHost) {
            throw new ErrorHandler(StatusCodes.FORBIDDEN, "You are not authorized to view this booking.");
        }
    }

    return sendSuccessResponse(
        res,
        StatusCodes.OK,
        { booking },
        "Booking fetched successfully."
    );
};

export const listBookings = async (req: Request, res: Response) => {
    const { teamId, eventId, hostUserId, status, search, startDate, endDate, page, limit } = req.query;
    const caller = res.locals.authUser as CallerContext;

    let targetHostId = getStringParam(hostUserId);
    let targetTeamId = getStringParam(teamId);

    if (caller.role === UserRole.COACH) {
        targetHostId = caller.id;
    }

    const pageNum = page ? parseInt(page as string, 10) : 1;
    const limitNum = limit ? parseInt(limit as string, 10) : 10;

    const { bookings, totalCount } = await BookingService.listBookings({
        teamId: targetTeamId,
        eventId: getStringParam(eventId),
        hostUserId: targetHostId,
        status: status as BookingStatus | undefined,
        search: getStringParam(search),
        startDate: getStringParam(startDate),
        endDate: getStringParam(endDate),
        page: pageNum,
        limit: limitNum,
    });

    return sendSuccessResponse(
        res,
        StatusCodes.OK,
        {
            bookings,
            pagination: {
                total: totalCount,
                page: pageNum,
                pageSize: limitNum,
                totalPages: Math.ceil(totalCount / limitNum)
            }
        },
        "Bookings fetched successfully."
    );
};

export const updateBooking = async (req: Request, res: Response) => {
    const id = getStringParam(req.params.id);
    if (!id) {
        throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Booking ID is required.");
    }

    const oldBooking = await BookingService.getBooking(id);
    const { status, coHostUserIds } = req.body;

    const booking = await BookingService.updateBooking(id, {
        status: status as BookingStatus | undefined,
        coHostUserIds
    });

    if (status && status !== oldBooking.status) {
        void queueBookingStatusNotifications(booking);
    }

    void queueBookingUpdatedNotifications(oldBooking, booking);

    return sendSuccessResponse(
        res,
        StatusCodes.OK,
        { booking },
        "Booking updated successfully."
    );
};
