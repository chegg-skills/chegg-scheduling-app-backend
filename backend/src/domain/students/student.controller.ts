import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import { ErrorHandler } from "../../shared/error/errorhandler";
import type { CallerContext } from "../../shared/utils/userUtils";
import * as StudentService from "./student.service";

const listStudents = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const result = await StudentService.listStudents(caller, req.query as any);

  return sendSuccessResponse(
    res,
    StatusCodes.OK,
    result,
    "Students fetched successfully.",
  );
};

const readStudent = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const { studentId } = req.params;

  const student = await StudentService.readStudent(studentId as string, caller);
  return sendSuccessResponse(
    res,
    StatusCodes.OK,
    student,
    "Student fetched successfully.",
  );
};

const listStudentBookings = async (req: Request, res: Response) => {
  const caller = res.locals.authUser as CallerContext;
  const { studentId } = req.params;

  const result = await StudentService.listStudentBookings(studentId as string, caller, req.query as any);

  return sendSuccessResponse(
    res,
    StatusCodes.OK,
    result,
    "Student bookings fetched successfully.",
  );
};

export { listStudents, readStudent, listStudentBookings };
