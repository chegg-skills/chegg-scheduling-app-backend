import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";

/**
 * Get all supported IANA timezones
 */
export const getTimezones = (_req: Request, res: Response) => {
    // @ts-ignore - supportedValuesOf is and should be available in modern Node.js
    const timezones = Intl.supportedValuesOf("timeZone");

    return sendSuccessResponse(
        res,
        StatusCodes.OK,
        { timezones },
        "Timezones fetched successfully."
    );
};
