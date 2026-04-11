import { Router, Request, Response, NextFunction } from "express";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import * as availabilityController from "./availability.controller";

import { validate } from "../../shared/middleware/validate";
import {
  SetWeeklyAvailabilitySchema,
  AddAvailabilityExceptionSchema,
  GetEffectiveAvailabilitySchema,
  UserIdParamSchema,
  ExceptionIdParamSchema,
} from "./availability.schema";

import { assertCanManageAvailability } from "./availability.shared";
import type { CallerContext } from "../../shared/utils/userUtils";

const router = Router({ mergeParams: true });

const checkAuth = (mode: 'weekly' | 'exceptions', action: 'read' | 'write' = 'write') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const caller = res.locals.authUser as CallerContext;
    const { userId } = req.params;
    try {
      assertCanManageAvailability(userId as string, caller, mode, action);
      next();
    } catch (error) {
      next(error);
    }
  };
};

router
  .route("/weekly")
  .post(checkAuth('weekly', 'write'), validate(SetWeeklyAvailabilitySchema), availabilityController.setWeeklyAvailability)
  .get(checkAuth('weekly', 'read'), validate(UserIdParamSchema), availabilityController.getWeeklyAvailability)
  .all(methodNotAllowed);

router
  .route("/exceptions")
  .post(checkAuth('exceptions', 'write'), validate(AddAvailabilityExceptionSchema), availabilityController.addAvailabilityException)
  .get(checkAuth('exceptions', 'read'), validate(UserIdParamSchema), availabilityController.getAvailabilityExceptions)
  .all(methodNotAllowed);

router
  .route("/exceptions/:exceptionId")
  .delete(checkAuth('exceptions', 'write'), validate(ExceptionIdParamSchema), availabilityController.removeAvailabilityException)
  .all(methodNotAllowed);

router
  .route("/effective")
  .get(checkAuth('exceptions', 'read'), validate(GetEffectiveAvailabilitySchema), availabilityController.getEffectiveAvailability)
  .all(methodNotAllowed);

export default router;
