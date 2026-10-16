import { prisma } from "../../shared/db/prisma";
import { runBatch, type DbClient } from "../../shared/db/repository";

const questionSelect = { id: true, text: true, order: true } as const;

export type BookingQuestionRow = { id: string; text: string; order: number };

export interface BookingQuestionRepository {
  list(tx?: DbClient): Promise<BookingQuestionRow[]>;
  listTexts(tx?: DbClient): Promise<Array<{ text: string }>>;
  count(tx?: DbClient): Promise<number>;
  maxOrder(tx?: DbClient): Promise<number | null>;
  findById(id: string, tx?: DbClient): Promise<{ id: string } | null>;
  create(data: { text: string; order: number }, tx?: DbClient): Promise<BookingQuestionRow>;
  update(
    id: string,
    data: { text?: string; order?: number },
    tx?: DbClient,
  ): Promise<BookingQuestionRow>;
  /** Deletes the question, then renumbers the rest 0..n-1 (the renumber is one atomic batch). */
  deleteAndCompactOrder(id: string, tx?: DbClient): Promise<void>;
}

export const createBookingQuestionRepo = (db: DbClient = prisma): BookingQuestionRepository => ({
  list: (tx) =>
    (tx ?? db).systemBookingQuestion.findMany({
      orderBy: { order: "asc" },
      select: questionSelect,
    }),

  listTexts: (tx) =>
    (tx ?? db).systemBookingQuestion.findMany({
      orderBy: { order: "asc" },
      select: { text: true },
    }),

  count: (tx) => (tx ?? db).systemBookingQuestion.count(),

  maxOrder: async (tx) => {
    const result = await (tx ?? db).systemBookingQuestion.aggregate({ _max: { order: true } });
    return result._max.order;
  },

  findById: (id, tx) => (tx ?? db).systemBookingQuestion.findUnique({ where: { id } }),

  create: (data, tx) => (tx ?? db).systemBookingQuestion.create({ data, select: questionSelect }),

  update: (id, data, tx) =>
    (tx ?? db).systemBookingQuestion.update({ where: { id }, data, select: questionSelect }),

  deleteAndCompactOrder: async (id, tx) => {
    const client = tx ?? db;
    await client.systemBookingQuestion.delete({ where: { id } });

    // Compact order values so there are no gaps
    const remaining = await client.systemBookingQuestion.findMany({ orderBy: { order: "asc" } });
    await runBatch(
      client,
      remaining.map((q, idx) =>
        client.systemBookingQuestion.update({ where: { id: q.id }, data: { order: idx } }),
      ),
    );
  },
});
