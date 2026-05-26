import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as bookingPageService from "./bookingPage.service";

const createBookingPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const bookingPage = await bookingPageService.createBookingPage(req.body, caller);
    sendSuccessResponse(res, StatusCodes.CREATED, { bookingPage }, "Booking page created successfully.");
  } catch (error) {
    next(error);
  }
};

const listBookingPages = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const bookingPages = await bookingPageService.listBookingPages(caller);
    sendSuccessResponse(res, StatusCodes.OK, { bookingPages }, "Booking pages fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const getBookingPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const { pageId } = req.params as { pageId: string };
    const bookingPage = await bookingPageService.getBookingPage(pageId, caller);
    sendSuccessResponse(res, StatusCodes.OK, { bookingPage }, "Booking page fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const updateBookingPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const { pageId } = req.params as { pageId: string };
    const bookingPage = await bookingPageService.updateBookingPage(pageId, req.body, caller);
    sendSuccessResponse(res, StatusCodes.OK, { bookingPage }, "Booking page updated successfully.");
  } catch (error) {
    next(error);
  }
};

const deleteBookingPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const { pageId } = req.params as { pageId: string };
    await bookingPageService.deleteBookingPage(pageId, caller);
    res.status(StatusCodes.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
};

const addSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const { pageId } = req.params as { pageId: string };
    const bookingPage = await bookingPageService.addSection(pageId, req.body, caller);
    sendSuccessResponse(res, StatusCodes.OK, { bookingPage }, "Section added successfully.");
  } catch (error) {
    next(error);
  }
};

const removeSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const { pageId, sectionId } = req.params as { pageId: string; sectionId: string };
    const bookingPage = await bookingPageService.removeSection(pageId, sectionId, caller);
    sendSuccessResponse(res, StatusCodes.OK, { bookingPage }, "Section removed successfully.");
  } catch (error) {
    next(error);
  }
};

const addTeamToSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const { pageId, sectionId } = req.params as { pageId: string; sectionId: string };
    const bookingPage = await bookingPageService.addTeamToSection(pageId, sectionId, req.body, caller);
    sendSuccessResponse(res, StatusCodes.OK, { bookingPage }, "Team added to section successfully.");
  } catch (error) {
    next(error);
  }
};

const removeTeamFromSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = res.locals.authUser as CallerContext;
    const { pageId, sectionId, teamId } = req.params as { pageId: string; sectionId: string; teamId: string };
    const bookingPage = await bookingPageService.removeTeamFromSection(pageId, sectionId, teamId, caller);
    sendSuccessResponse(res, StatusCodes.OK, { bookingPage }, "Team removed from section successfully.");
  } catch (error) {
    next(error);
  }
};

export {
  createBookingPage,
  listBookingPages,
  getBookingPage,
  updateBookingPage,
  deleteBookingPage,
  addSection,
  removeSection,
  addTeamToSection,
  removeTeamFromSection,
};
