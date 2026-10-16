import { prisma } from "../../shared/db/prisma";
import { runBatch, type DbClient } from "../../shared/db/repository";

export interface SystemSettingRepository {
  findValuesByKeys(keys: string[], tx?: DbClient): Promise<Array<{ key: string; value: string }>>;
  findValueByKey(key: string, tx?: DbClient): Promise<string | null>;
  upsertMany(entries: Array<[string, string]>, tx?: DbClient): Promise<void>;
}

export const createSystemSettingRepo = (db: DbClient = prisma): SystemSettingRepository => ({
  findValuesByKeys: (keys, tx) =>
    (tx ?? db).systemSetting.findMany({
      where: { key: { in: keys } },
      select: { key: true, value: true },
    }),

  findValueByKey: async (key, tx) => {
    const row = await (tx ?? db).systemSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  },

  upsertMany: (entries, tx) => {
    const client = tx ?? db;
    return runBatch(
      client,
      entries.map(([key, value]) =>
        client.systemSetting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        }),
      ),
    );
  },
});
