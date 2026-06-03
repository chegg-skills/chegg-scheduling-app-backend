import express from "express";
import { UserRole } from "@prisma/client";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { validate } from "../../shared/middleware/validate";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import * as controller from "./systemSetting.controller";
import { UpdateSystemSettingsSchema } from "./systemSetting.schema";

const router = express.Router();

router
  .route("/system-settings")
  .get(authenticate, authorize(UserRole.SUPER_ADMIN), controller.getSystemSettingsController)
  .put(
    authenticate,
    authorize(UserRole.SUPER_ADMIN),
    validate(UpdateSystemSettingsSchema),
    controller.updateSystemSettingsController,
  )
  .all(methodNotAllowed);

export default router;
