
import type { Response } from "express";

import ResponseBody from "./responseBody";

const sendSuccessResponse = <T>(
    res: Response,
    status: number,
    data?: T,
    message: string = "Success"
) => {
    return res.status(status).json(ResponseBody.successResponse(message, data));
};

const sendErrorResponse = <E>(
    res: Response,
    status: number,
    message: string = "Error",
    error?: E
) => {
    return res.status(status).json(ResponseBody.errorResponse(message, error));
};

const sendFileResponse = (
    res: Response,
    status: number,
    content: string | Buffer,
    contentType: string,
    filename: string
) => {
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(status).send(content);
};

export { sendSuccessResponse, sendErrorResponse, sendFileResponse };  