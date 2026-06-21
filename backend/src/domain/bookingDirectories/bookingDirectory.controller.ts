import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/http/responseHelper";
import { requireAuthUser } from "../../shared/utils/userUtils";
import * as bookingDirectoryService from "./bookingDirectory.service";

const createBookingDirectory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = requireAuthUser(res.locals);
    const bookingDirectory = await bookingDirectoryService.createBookingDirectory(req.body, caller);
    sendSuccessResponse(
      res,
      StatusCodes.CREATED,
      { bookingDirectory },
      "Booking directory created successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const listBookingDirectories = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = requireAuthUser(res.locals);
    const bookingDirectories = await bookingDirectoryService.listBookingDirectories(caller);
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      { bookingDirectories },
      "Booking directories fetched successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const getBookingDirectory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = requireAuthUser(res.locals);
    const { directoryId } = req.params as { directoryId: string };
    const bookingDirectory = await bookingDirectoryService.getBookingDirectory(directoryId, caller);
    sendSuccessResponse(res, StatusCodes.OK, { bookingDirectory }, "Booking directory fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const updateBookingDirectory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = requireAuthUser(res.locals);
    const { directoryId } = req.params as { directoryId: string };
    const bookingDirectory = await bookingDirectoryService.updateBookingDirectory(directoryId, req.body, caller);
    sendSuccessResponse(res, StatusCodes.OK, { bookingDirectory }, "Booking directory updated successfully.");
  } catch (error) {
    next(error);
  }
};

const deleteBookingDirectory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = requireAuthUser(res.locals);
    const { directoryId } = req.params as { directoryId: string };
    await bookingDirectoryService.deleteBookingDirectory(directoryId, caller);
    res.status(StatusCodes.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
};

const addSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = requireAuthUser(res.locals);
    const { directoryId } = req.params as { directoryId: string };
    const bookingDirectory = await bookingDirectoryService.addSection(directoryId, req.body, caller);
    sendSuccessResponse(res, StatusCodes.OK, { bookingDirectory }, "Section added successfully.");
  } catch (error) {
    next(error);
  }
};

const removeSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = requireAuthUser(res.locals);
    const { directoryId, sectionId } = req.params as { directoryId: string; sectionId: string };
    const bookingDirectory = await bookingDirectoryService.removeSection(directoryId, sectionId, caller);
    sendSuccessResponse(res, StatusCodes.OK, { bookingDirectory }, "Section removed successfully.");
  } catch (error) {
    next(error);
  }
};

const addTeamToSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = requireAuthUser(res.locals);
    const { directoryId, sectionId } = req.params as { directoryId: string; sectionId: string };
    const bookingDirectory = await bookingDirectoryService.addTeamToSection(
      directoryId,
      sectionId,
      req.body,
      caller,
    );
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      { bookingDirectory },
      "Team added to section successfully.",
    );
  } catch (error) {
    next(error);
  }
};

const removeTeamFromSection = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const caller = requireAuthUser(res.locals);
    const { directoryId, sectionId, teamId } = req.params as {
      directoryId: string;
      sectionId: string;
      teamId: string;
    };
    const bookingDirectory = await bookingDirectoryService.removeTeamFromSection(
      directoryId,
      sectionId,
      teamId,
      caller,
    );
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      { bookingDirectory },
      "Team removed from section successfully.",
    );
  } catch (error) {
    next(error);
  }
};

export {
  createBookingDirectory,
  listBookingDirectories,
  getBookingDirectory,
  updateBookingDirectory,
  deleteBookingDirectory,
  addSection,
  removeSection,
  addTeamToSection,
  removeTeamFromSection,
};
