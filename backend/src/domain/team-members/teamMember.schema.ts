import { z } from "zod";
import { UserRole } from "@prisma/client";

const teamIdParam = z.object({
  teamId: z.uuid("Invalid team ID"),
});

export const AddTeamMemberSchema = {
  params: teamIdParam,
  body: z
    .looseObject({
      userId: z.uuid("Invalid user ID").optional(),
      userIds: z.array(z.uuid()).optional(),
      role: z.enum(UserRole).optional(),
    })
    .refine((data) => data.userId || (data.userIds && data.userIds.length > 0), {
      message: "Either userId or a non-empty userIds array must be provided",
      path: ["userId"],
    }),
};

export const TeamIdParamSchema = {
  params: teamIdParam,
};

export const RemoveTeamMemberSchema = {
  params: z.object({
    teamId: z.uuid("Invalid team ID"),
    userId: z.uuid("Invalid user ID"),
  }),
};
