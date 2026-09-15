import type { LedgerType, MealType } from './types';

// 预设数据：分类颜色、图标、油费类型。分类/账户表单从这里取可选值。

/** 分类可选颜色 */
export const COLOR_OPTIONS = [
  '#f97316', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444',
  '#14b8a6', '#22c55e', '#eab308', '#a855f7', '#64748b', '#84cc16',
];

/** 分类/账户可选图标 */
export const EMOJI_OPTIONS = [
  '🍜', '🚗', '🛍️', '🏠', '🎮', '💊', '📚', '📦',
  '💰', '🧧', '📈', '💼', '🎁', '🍔', '☕', '✈️',
  '👕', '🐱', '🎬', '📱', '💄', '🚌', '⛽', '🏥',
  '🎓', '🧾', '🏃', '🎵',
];

/** 油费类型（车辆账本「油费」记录可选） */
export const FUEL_TYPE_OPTIONS = ['92#', '95#', '98#', '柴油', '充电'];

/** 餐次类型（饮食账本一顿饭可选：早/午/晚/加餐） */
export const MEAL_TYPE_OPTIONS: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: '早餐' },
  { value: 'lunch', label: '午餐' },
  { value: 'dinner', label: '晚餐' },
  { value: 'snack', label: '加餐' },
];

/** 账本类型的中文标签（账本列表/切换/设置页展示用） */
export const LEDGER_TYPE_LABELS: Record<LedgerType, string> = {
  general: '普通',
  vehicle: '用车',
  diet: '饮食',
};
