import { prisma } from "../../shared/db/prisma";

export interface SystemSettings {
  feedbackFormLink: string;
}

const SETTING_KEYS: Array<keyof SystemSettings> = ["feedbackFormLink"];

const DEFAULTS: SystemSettings = {
  feedbackFormLink: "",
};

export const getSystemSettings = async (): Promise<SystemSettings> => {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: SETTING_KEYS } },
    select: { key: true, value: true },
  });

  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    feedbackFormLink: map.feedbackFormLink ?? DEFAULTS.feedbackFormLink,
  };
};

export const getSystemSettingByKey = async (key: keyof SystemSettings): Promise<string | null> => {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  return row?.value ?? null;
};

export const updateSystemSettings = async (data: Partial<SystemSettings>): Promise<SystemSettings> => {
  const entries = Object.entries(data).filter(([k]) => SETTING_KEYS.includes(k as keyof SystemSettings));

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        create: { key, value: value ?? "" },
        update: { value: value ?? "" },
      })
    )
  );

  return getSystemSettings();
};
