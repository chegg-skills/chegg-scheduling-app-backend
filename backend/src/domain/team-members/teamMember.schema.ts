import { z } from "zod";
import { UserRole } from "@prisma/client";

const teamIdParam = z.object({
    teamId: z.string().uuid("Invalid team ID"),
});

export const AddTeamMemberSchema = {
    params: teamIdParam,
    body: z.object({
        userId: z.string().uuid("Invalid user ID").optional(),
        userIds: z.array(z.string().uuid()).optional(),
        role: z.nativeEnum(UserRole).optional(),
    }).refine(data => data.userId || (data.userIds && data.userIds.length > 0), {
        message: "Either userId or a non-empty userIds array must be provided",
        path: ["userId"],
    }).passthrough(),
};

export const TeamIdParamSchema = {
    params: teamIdParam,
};

export const RemoveTeamMemberSchema = {
    params: z.object({
        teamId: z.string().uuid("Invalid team ID"),
        userId: z.string().uuid("Invalid user ID"),
    }),
};
