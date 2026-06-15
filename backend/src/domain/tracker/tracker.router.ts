import express from "express";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import { validate } from "../../shared/middleware/validate";
import * as trackerController from "./tracker.controller";
import { TrackerSlotsQuerySchema } from "./tracker.schema";

const router = express.Router();

router
  .route("/slots")
  .get(validate(TrackerSlotsQuerySchema), trackerController.getTrackerSlots)
  .all(methodNotAllowed);

router
  .route("/filters")
  .get(trackerController.getTrackerFilters)
  .all(methodNotAllowed);

export default router;
