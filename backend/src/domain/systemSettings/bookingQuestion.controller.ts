import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/http/responseHelper";
import type { BookingQuestionService } from "./bookingQuestion.service";

export const createBookingQuestionController = (questionService: BookingQuestionService) => {
  const listDefaultQuestionsController = async (_req: Request, res: Response) => {
    const questions = await questionService.listDefaultQuestions();
    return sendSuccessResponse(res, StatusCodes.OK, { questions });
  };

  const createDefaultQuestionController = async (req: Request, res: Response) => {
    const { text } = req.body;
    const question = await questionService.createDefaultQuestion(text);
    return sendSuccessResponse(res, StatusCodes.CREATED, { question }, "Default question created.");
  };

  const updateDefaultQuestionController = async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { text, order } = req.body;
    const question = await questionService.updateDefaultQuestion(id, { text, order });
    return sendSuccessResponse(res, StatusCodes.OK, { question }, "Default question updated.");
  };

  const deleteDefaultQuestionController = async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    await questionService.deleteDefaultQuestion(id);
    return sendSuccessResponse(res, StatusCodes.OK, {}, "Default question deleted.");
  };

  return {
    listDefaultQuestionsController: asyncHandler(listDefaultQuestionsController),
    createDefaultQuestionController: asyncHandler(createDefaultQuestionController),
    updateDefaultQuestionController: asyncHandler(updateDefaultQuestionController),
    deleteDefaultQuestionController: asyncHandler(deleteDefaultQuestionController),
  };
};

export type BookingQuestionController = ReturnType<typeof createBookingQuestionController>;
