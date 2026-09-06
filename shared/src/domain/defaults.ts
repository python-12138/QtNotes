// 全局默认常量（无依赖，供 store 与各 DataProvider 实现共用）
import type { AppSettings } from '../types';

export const SETTINGS_ID = 'main';

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
