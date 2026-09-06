import { computed } from 'vue';
import { db } from '../db/db';
import { useLiveQuery } from './useLiveQuery';
import type { AppSettings } from '../db/types';

const SETTINGS_ID = 'main';

export const DEFAULT_SETTINGS: AppSettings = {
  id: SETTINGS_ID,
  fuelBaselineAmount: 0,
  fuelBaselineKm: 0,
  oilProvince: '上海',
  oilGrade: '92#',
  oilAppId: '',
  oilAppSecret: '',
  oilPrice: 0,
  oilPriceUpdatedAt: 0,
};

/** 确保设置行存在，返回当前设置 */
export async function ensureSettings(): Promise<AppSettings> {
  const s = await db.settings.get(SETTINGS_ID);
  if (s) return s;
  const created = { ...DEFAULT_SETTINGS };
  await db.settings.add(created);
  return created;
}

/** 局部更新设置 */
export async function saveSettings(patch: Partial<AppSettings>): Promise<void> {
  await ensureSettings();
  await db.settings.update(SETTINGS_ID, patch);
}

/** 设置（响应式）；未加载时返回默认值 */
export function useSettings() {
  const s = useLiveQuery(() => db.settings.get(SETTINGS_ID), []);
  return computed<AppSettings>(() => s.value ?? { ...DEFAULT_SETTINGS });
}
