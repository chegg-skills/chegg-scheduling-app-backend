import { Router } from "express";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import reportController from "./report.controller";

const router = Router();

router.route("/bookings").get(reportController.downloadBookingsReport).all(methodNotAllowed);
router.route("/performance").get(reportController.downloadPerformanceReport).all(methodNotAllowed);
router.route("/students").get(reportController.downloadStudentReport).all(methodNotAllowed);

export default router;
