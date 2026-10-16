import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { stripHtml } from "../../shared/utils/htmlSanitizer";
import type { BookingQuestionRepository } from "./bookingQuestion.repository";

const MAX_QUESTIONS = 5;

export const createBookingQuestionService = (questionRepo: BookingQuestionRepository) => {
  const listDefaultQuestions = async () => questionRepo.list();

  const createDefaultQuestion = async (text: string) => {
    const count = await questionRepo.count();
    if (count >= MAX_QUESTIONS) {
      throw new ErrorHandler(
        StatusCodes.UNPROCESSABLE_ENTITY,
        `A maximum of ${MAX_QUESTIONS} default booking questions are allowed.`,
      );
    }

    const sanitized = stripHtml(text.trim());
    if (!sanitized) {
      throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Question text cannot be empty.");
    }

    const maxOrder = await questionRepo.maxOrder();
    const nextOrder = (maxOrder ?? -1) + 1;

    return questionRepo.create({ text: sanitized, order: nextOrder });
  };

  const updateDefaultQuestion = async (id: string, data: { text?: string; order?: number }) => {
    const existing = await questionRepo.findById(id);
    if (!existing) {
      throw new ErrorHandler(StatusCodes.NOT_FOUND, "Default booking question not found.");
    }

    const updateData: { text?: string; order?: number } = {};

    if (data.text !== undefined) {
      const sanitized = stripHtml(data.text.trim());
      if (!sanitized) {
        throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Question text cannot be empty.");
      }
      updateData.text = sanitized;
    }

    if (data.order !== undefined) {
      updateData.order = data.order;
    }

    return questionRepo.update(id, updateData);
  };

  const deleteDefaultQuestion = async (id: string) => {
    const existing = await questionRepo.findById(id);
    if (!existing) {
      throw new ErrorHandler(StatusCodes.NOT_FOUND, "Default booking question not found.");
    }

    await questionRepo.deleteAndCompactOrder(id);
  };

  const getDefaultQuestionTexts = async (): Promise<string[]> => {
    const questions = await questionRepo.listTexts();
    return questions.map((q) => q.text);
  };

  return {
    listDefaultQuestions,
    createDefaultQuestion,
    updateDefaultQuestion,
    deleteDefaultQuestion,
    getDefaultQuestionTexts,
  };
};

export type BookingQuestionService = ReturnType<typeof createBookingQuestionService>;
