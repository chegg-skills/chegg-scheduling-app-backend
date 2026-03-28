import { Router } from "express";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import * as availabilityController from "./availability.controller";

const router = Router({ mergeParams: true });


router
  .route("/weekly")
  .post(availabilityController.setWeeklyAvailability)
  .get(availabilityController.getWeeklyAvailability)
  .all(methodNotAllowed);

router
  .route("/exceptions")
  .post(availabilityController.addAvailabilityException)
  .get(availabilityController.getAvailabilityExceptions)
  .all(methodNotAllowed);

router
  .route("/exceptions/:exceptionId")
  .delete(availabilityController.removeAvailabilityException)
  .all(methodNotAllowed);

router
  .route("/effective")
  .get(availabilityController.getEffectiveAvailability)
  .all(methodNotAllowed);

export default router;
