import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../error/errorhandler";

export const requireTrimmedString = (
  value: unknown,
  fieldName: string,
  message = `${fieldName} is required.`,
): string => {
  if (typeof value !== "string") {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, message);
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, message);
  }

  return normalizedValue;
};

export const requireEntityId = (value: unknown, fieldName: string): string =>
  requireTrimmedString(value, fieldName, `${fieldName} is required.`);

export const normalizeRequiredString = (
  value: unknown,
  fieldName: string,
): string => requireTrimmedString(value, fieldName, `${fieldName} is required.`);

export const normalizeOptionalString = (
  value: unknown,
  fieldName: string,
): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      `${fieldName} must be a string.`,
    );
  }

  return value.trim() || null;
};

export const parseRequiredEnum = <T extends string>(
  value: unknown,
  fieldName: string,
  validator: (candidate: string) => candidate is T,
): T => {
  const normalized = normalizeRequiredString(value, fieldName);
  if (!validator(normalized)) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, `Invalid ${fieldName}.`);
  }

  return normalized;
};

export const parseOptionalEnum = <T extends string>(
  value: unknown,
  fieldName: string,
  validator: (candidate: string) => candidate is T,
): T | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const normalized = normalizeRequiredString(value, fieldName);
  if (!validator(normalized)) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, `Invalid ${fieldName}.`);
  }

  return normalized;
};

export const parsePositiveInt = (value: unknown, fieldName: string): number => {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      `${fieldName} must be a positive integer.`,
    );
  }

  return Number(value);
};

export const parseNonNegativeInt = (value: unknown, fieldName: string): number => {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      `${fieldName} must be a non-negative integer.`,
    );
  }

  return Number(value);
};

export const parseDurationSeconds = (value: unknown): number => {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "durationSeconds must be a positive integer.",
    );
  }

  return Number(value);
};

export const assertMinimumLength = (
  value: string,
  minimumLength: number,
  message: string,
): string => {
  if (value.length < minimumLength) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, message);
  }

  return value;
};

export const validateTimeFormat = (time: string, fieldName: string): void => {
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!timeRegex.test(time)) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      `${fieldName} must be in HH:mm format.`,
    );
  }
};

export const assertStartBeforeEnd = (
  startTime: string,
  endTime: string,
  message = "startTime must be before endTime.",
): void => {
  if (startTime >= endTime) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, message);
  }
};

export const parseDateInput = (
  value: Date | string,
  fieldName = "date",
): Date => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      `Invalid ${fieldName} provided.`,
    );
  }

  return date;
};
