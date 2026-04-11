import { z } from "zod";

export const ListStudentsSchema = {
    query: z.object({
        page: z.coerce.number().int().positive().default(1),
        pageSize: z.coerce.number().int().positive().default(50),
        search: z.string().optional(),
    }).passthrough(),
};

export const StudentIdParamSchema = {
    params: z.object({
        studentId: z.string().uuid("Invalid student ID"),
    }),
};
