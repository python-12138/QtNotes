import { computed } from 'vue';
import { getDataProvider } from '../data/provider';
import { currentLedgerId } from './currentLedger';
import type { MealRecord } from '../types';

// 当前账本下的「一顿饭」记录，按日期倒序（同日再按创建时间倒序）。
// 用法同 useTrips：页面里 useMeals() 拿到响应式列表，随 currentLedgerId 与数据写入自动刷新。
export function useMeals() {
  const list = getDataProvider().queryMeals(currentLedgerId);
  return computed<MealRecord[]>(() => {
    const arr = list.value;
    return [...arr].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  });
}
