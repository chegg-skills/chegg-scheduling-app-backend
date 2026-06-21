import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/http/responseHelper";
import {
  listDefaultQuestions,
  createDefaultQuestion,
  updateDefaultQuestion,
  deleteDefaultQuestion,
} from "./bookingQuestion.service";

const listDefaultQuestionsController = async (_req: Request, res: Response) => {
  const questions = await listDefaultQuestions();
  return sendSuccessResponse(res, StatusCodes.OK, { questions });
};

const createDefaultQuestionController = async (req: Request, res: Response) => {
  const { text } = req.body;
  const question = await createDefaultQuestion(text);
  return sendSuccessResponse(res, StatusCodes.CREATED, { question }, "Default question created.");
};

const updateDefaultQuestionController = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { text, order } = req.body;
  const question = await updateDefaultQuestion(id, { text, order });
  return sendSuccessResponse(res, StatusCodes.OK, { question }, "Default question updated.");
};

const deleteDefaultQuestionController = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await deleteDefaultQuestion(id);
  return sendSuccessResponse(res, StatusCodes.OK, {}, "Default question deleted.");
};

export default {
  listDefaultQuestionsController: asyncHandler(listDefaultQuestionsController),
  createDefaultQuestionController: asyncHandler(createDefaultQuestionController),
  updateDefaultQuestionController: asyncHandler(updateDefaultQuestionController),
  deleteDefaultQuestionController: asyncHandler(deleteDefaultQuestionController),
};
