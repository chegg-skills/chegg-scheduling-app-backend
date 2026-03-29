import express from "express";
import authRoutes from "../domain/auth/auth.router";
import eventRoutes from "../domain/events/event.router";
import inviteRoutes from "../domain/invite/invite.router";
import teamMemberRoutes from "../domain/team-members/teamMember.router";
import usersRoutes from "../domain/users/user.router";
import teamRoutes from "../domain/teams/team.router";
import configRoutes from "../domain/config/config.router";
import bookingRoutes from "../domain/bookings/booking.router";
import publicRoutes from "../domain/public/public.router";
import v1routes from "./v1/index";
import { authenticate } from "../shared/middleware/auth";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/public", publicRoutes);
router.use("/config", configRoutes);
router.use("/invites", inviteRoutes);
router.use("/users", usersRoutes);
router.use("/teams", teamRoutes);
router.use("/bookings", bookingRoutes);
router.use(teamMemberRoutes);
router.use(eventRoutes);

router.use("/v1", authenticate, v1routes);

export default router;
