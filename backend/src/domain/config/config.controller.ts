import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import { ConfigService } from "./config.service";

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

/**
 * Get all countries
 */
export const getCountries = (_req: Request, res: Response) => {
    const countries = ConfigService.getCountries();

    return sendSuccessResponse(
        res,
        StatusCodes.OK,
        { countries },
        "Countries fetched successfully."
    );
};

/**
 * Get all languages
 */
export const getLanguages = (_req: Request, res: Response) => {
    const languages = ConfigService.getLanguages();

    return sendSuccessResponse(
        res,
        StatusCodes.OK,
        { languages },
        "Languages fetched successfully."
    );
};
