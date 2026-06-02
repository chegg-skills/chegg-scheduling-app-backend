import { UserRole } from "@prisma/client";
import type { CallerContext } from "../utils/userUtils";

export const isCoach = (caller: CallerContext): boolean => caller.role === UserRole.COACH;

export const isTeamAdmin = (caller: CallerContext): boolean => caller.role === UserRole.TEAM_ADMIN;

export const isSuperAdmin = (caller: CallerContext): boolean =>
  caller.role === UserRole.SUPER_ADMIN;

export const isAdmin = (caller: CallerContext): boolean =>
  caller.role === UserRole.SUPER_ADMIN || caller.role === UserRole.TEAM_ADMIN;

export const canReadUser = (caller: CallerContext, targetUserId: string): boolean =>
  isAdmin(caller) || caller.id === targetUserId;
