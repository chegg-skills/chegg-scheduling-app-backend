import { z } from "zod";

export const ListStudentsSchema = {
  query: z.looseObject({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().default(50),
    search: z.string().optional(),
  }),
};

export const StudentIdParamSchema = {
  params: z.object({
    studentId: z.uuid("Invalid student ID"),
  }),
};
