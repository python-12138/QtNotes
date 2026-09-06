import { getDataProvider } from '../data/provider';
import { DEFAULT_SETTINGS } from '../domain/defaults';
import type { AppSettings } from '../types';

// 设置默认值（供 OilConfigModal 等引用，保持对外导出）
export { DEFAULT_SETTINGS };

/** 设置（响应式）；未加载时返回默认值 */
export function useSettings() {
  return getDataProvider().querySettings();
}

/** 局部更新设置 */
export async function saveSettings(patch: Partial<AppSettings>): Promise<void> {
  await getDataProvider().saveSettings(patch);
}

/** 确保设置行存在，返回当前设置 */
export async function ensureSettings(): Promise<AppSettings> {
  return getDataProvider().getSettings();
}
