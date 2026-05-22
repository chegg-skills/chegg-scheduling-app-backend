import express from "express";
import { UserRole } from "@prisma/client";
import { methodNotAllowed } from "../../shared/error/methodNotAllowed";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { validate } from "../../shared/middleware/validate";
import * as eventGroupController from "./eventGroup.controller";
import {
  CreateEventGroupSchema,
  EventGroupParamsSchema,
  ListEventGroupsSchema,
  UpdateEventGroupSchema,
} from "./eventGroup.schema";

const router = express.Router();

router
  .route("/teams/:teamId/event-groups")
  .post(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    validate(CreateEventGroupSchema),
    eventGroupController.createEventGroup,
  )
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    validate(ListEventGroupsSchema),
    eventGroupController.listTeamEventGroups,
  )
  .all(methodNotAllowed);

router
  .route("/event-groups/:groupId")
  .get(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    validate(EventGroupParamsSchema),
    eventGroupController.readEventGroup,
  )
  .patch(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    validate(UpdateEventGroupSchema),
    eventGroupController.updateEventGroup,
  )
  .delete(
    authenticate,
    authorize(UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN),
    validate(EventGroupParamsSchema),
    eventGroupController.deleteEventGroup,
  )
  .all(methodNotAllowed);

export default router;
