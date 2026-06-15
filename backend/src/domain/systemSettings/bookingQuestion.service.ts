import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { stripHtml } from "../../shared/utils/htmlSanitizer";

const MAX_QUESTIONS = 5;

export const listDefaultQuestions = async () => {
  return prisma.systemBookingQuestion.findMany({
    orderBy: { order: "asc" },
    select: { id: true, text: true, order: true },
  });
};

export const createDefaultQuestion = async (text: string) => {
  const count = await prisma.systemBookingQuestion.count();
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

  const maxOrder = await prisma.systemBookingQuestion.aggregate({ _max: { order: true } });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  return prisma.systemBookingQuestion.create({
    data: { text: sanitized, order: nextOrder },
    select: { id: true, text: true, order: true },
  });
};

export const updateDefaultQuestion = async (id: string, data: { text?: string; order?: number }) => {
  const existing = await prisma.systemBookingQuestion.findUnique({ where: { id } });
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

  return prisma.systemBookingQuestion.update({
    where: { id },
    data: updateData,
    select: { id: true, text: true, order: true },
  });
};

export const deleteDefaultQuestion = async (id: string) => {
  const existing = await prisma.systemBookingQuestion.findUnique({ where: { id } });
  if (!existing) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Default booking question not found.");
  }

  await prisma.systemBookingQuestion.delete({ where: { id } });

  // Compact order values so there are no gaps
  const remaining = await prisma.systemBookingQuestion.findMany({ orderBy: { order: "asc" } });
  await prisma.$transaction(
    remaining.map((q, idx) =>
      prisma.systemBookingQuestion.update({ where: { id: q.id }, data: { order: idx } }),
    ),
  );
};

export const getDefaultQuestionTexts = async (): Promise<string[]> => {
  const questions = await prisma.systemBookingQuestion.findMany({
    orderBy: { order: "asc" },
    select: { text: true },
  });
  return questions.map((q) => q.text);
};
