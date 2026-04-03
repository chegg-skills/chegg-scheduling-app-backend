import express from "express";
import { UserRole } from "@prisma/client";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import { authenticate, authorize } from "../../shared/middleware/auth";
import * as studentController from "./student.controller";

const router = express.Router();

router
  .route("/")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    studentController.listStudents,
  )
  .all(methodNotAllowed);

router
  .route("/:studentId")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    studentController.readStudent,
  )
  .all(methodNotAllowed);

router
  .route("/:studentId/bookings")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN, UserRole.COACH),
    studentController.listStudentBookings,
  )
  .all(methodNotAllowed);

export default router;
