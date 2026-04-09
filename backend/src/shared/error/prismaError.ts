import { Prisma } from "@prisma/client";
import { ErrorHandler } from "./errorhandler";

type PrismaErrorMapping = Partial<
  Record<string, { status: number; message: string }>
>;

export const rethrowPrismaError = (
  error: unknown,
  mappings: PrismaErrorMapping,
): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const mapping = mappings[error.code];
    if (mapping) {
      throw new ErrorHandler(mapping.status, mapping.message);
    }
  }

  throw error;
};
