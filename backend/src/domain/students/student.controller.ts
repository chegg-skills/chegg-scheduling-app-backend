import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import { ErrorHandler } from "../../shared/error/errorhandler";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as StudentService from "./student.service";

const getStringParam = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
};

const getNumberParam = (value: unknown): number | undefined => {
  const normalizedValue = getStringParam(value);
  if (!normalizedValue) return undefined;

  const parsed = Number.parseInt(normalizedValue, 10);
  if (Number.isNaN(parsed)) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Pagination params must be valid integers.");
  }

  return parsed;
};

const listStudents = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await StudentService.listStudents(caller, {
    page: getNumberParam(req.query.page),
    pageSize: getNumberParam(req.query.pageSize),
    search: getStringParam(req.query.search),
    teamId: getStringParam(req.query.teamId),
    eventId: getStringParam(req.query.eventId),
    hostUserId: getStringParam(req.query.hostUserId),
  });

  return sendSuccessResponse(
    res,
    StatusCodes.OK,
    result,
    "Students fetched successfully.",
  );
};

const readStudent = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const studentId = getStringParam(req.params.studentId);

  if (!studentId) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "studentId is required.");
  }

  const student = await StudentService.readStudent(studentId, caller);
  return sendSuccessResponse(
    res,
    StatusCodes.OK,
    { student },
    "Student fetched successfully.",
  );
};

const listStudentBookings = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const studentId = getStringParam(req.params.studentId);

  if (!studentId) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "studentId is required.");
  }

  const result = await StudentService.listStudentBookings(studentId, caller, {
    page: getNumberParam(req.query.page),
    pageSize: getNumberParam(req.query.pageSize),
  });

  return sendSuccessResponse(
    res,
    StatusCodes.OK,
    result,
    "Student bookings fetched successfully.",
  );
};

export { listStudents, readStudent, listStudentBookings };
