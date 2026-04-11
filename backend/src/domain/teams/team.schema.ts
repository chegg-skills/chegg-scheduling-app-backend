import { z } from "zod";

export const CreateTeamSchema = {
    body: z.object({
        name: z.string().trim().toLowerCase().min(1, "Team name is required"),
        description: z.string().trim().optional().nullable(),
        teamLeadId: z.string().uuid("Invalid user ID for team lead"),
        isActive: z.boolean().optional(),
    }).passthrough(),
};

export const UpdateTeamSchema = {
    params: z.object({
        teamId: z.string().uuid("Invalid team ID"),
    }),
    body: z.object({
        name: z.string().trim().toLowerCase().min(1, "Team name cannot be blank").optional(),
        description: z.string().trim().optional().nullable(),
        teamLeadId: z.string().uuid("Invalid user ID for team lead").optional(),
        isActive: z.boolean().optional(),
    }).passthrough(),
};

export const ListTeamsSchema = {
    query: z.object({
        page: z.preprocess((val) => {
            const parsed = parseInt(String(val), 10);
            return isNaN(parsed) || parsed < 1 ? undefined : parsed;
        }, z.number().int().positive().default(1)),
        pageSize: z.preprocess((val) => {
            const parsed = parseInt(String(val), 10);
            return isNaN(parsed) || parsed < 1 ? undefined : parsed;
        }, z.number().int().positive().default(50)),
        search: z.string().optional(),
    }).passthrough(),
};
