import type { SystemSettingRepository } from "./systemSetting.repository";

export interface SystemSettings {
  feedbackFormLink: string;
}

const SETTING_KEYS: Array<keyof SystemSettings> = ["feedbackFormLink"];

const DEFAULTS: SystemSettings = {
  feedbackFormLink: "",
};

export const createSystemSettingService = (settingRepo: SystemSettingRepository) => {
  const getSystemSettings = async (): Promise<SystemSettings> => {
    const rows = await settingRepo.findValuesByKeys(SETTING_KEYS);

    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      feedbackFormLink: map.feedbackFormLink ?? DEFAULTS.feedbackFormLink,
    };
  };

  const getSystemSettingByKey = async (key: keyof SystemSettings): Promise<string | null> =>
    settingRepo.findValueByKey(key);

  const updateSystemSettings = async (data: Partial<SystemSettings>): Promise<SystemSettings> => {
    const entries = Object.entries(data)
      .filter(([k]) => SETTING_KEYS.includes(k as keyof SystemSettings))
      .map(([key, value]): [string, string] => [key, value ?? ""]);

    await settingRepo.upsertMany(entries);

    return getSystemSettings();
  };

  return { getSystemSettings, getSystemSettingByKey, updateSystemSettings };
};

export type SystemSettingService = ReturnType<typeof createSystemSettingService>;
