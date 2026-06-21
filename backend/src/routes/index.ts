import express from "express";
import authRoutes from "../domain/auth/auth.router";
import ssoRoutes from "../domain/auth/sso.router";
import eventRoutes from "../domain/events/event.router";
import eventGroupRoutes from "../domain/eventGroups/eventGroup.router";
import inviteRoutes from "../domain/invite/invite.router";
import teamMemberRoutes from "../domain/teamMembers/teamMember.router";
import usersRoutes from "../domain/users/user.router";
import teamRoutes from "../domain/teams/team.router";
import configRoutes from "../domain/config/config.router";
import bookingRoutes from "../domain/bookings/booking.router";
import publicRoutes from "../domain/public/public.router";
import studentRoutes from "../domain/students/student.router";
import bookingDirectoryRoutes from "../domain/bookingDirectories/bookingDirectory.router";
import systemSettingRoutes from "../domain/systemSettings/systemSetting.router";
import v1routes from "./v1/index";
import { authenticate } from "../shared/middleware/auth";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/auth/sso", ssoRoutes);
router.use("/public", publicRoutes);
router.use("/config", configRoutes);
router.use("/invites", inviteRoutes);
router.use("/users", usersRoutes);
router.use("/teams", teamRoutes);
router.use("/bookings", bookingRoutes);
router.use("/students", studentRoutes);
router.use("/booking-directories", bookingDirectoryRoutes);
router.use("/system-settings", systemSettingRoutes);

// Mounted bare (no prefix) on purpose: each of these routers spans multiple
// top-level resources, so a single mount prefix can't represent them.
//   teamMemberRoutes  -> /teams/:teamId/members*
//   eventRoutes       -> /events*, /event-types*, /event-interaction-types, /teams/:teamId/events
//   eventGroupRoutes  -> /event-groups/:groupId, /teams/:teamId/event-groups
router.use(teamMemberRoutes);
router.use(eventRoutes);
router.use(eventGroupRoutes);

router.use("/v1", authenticate, v1routes);

export default router;
