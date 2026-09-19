import { computed } from 'vue';
import { getDataProvider } from '../data/provider';
import { currentLedgerId } from './currentLedger';
import type { FoodMenuItem } from '../types';

// 当前账本下的「食物菜单」项，按创建时间升序（同 useMeals，随 currentLedgerId 与写入自动刷新）。
export function useFoodItems() {
  const list = getDataProvider().queryFoodItems(currentLedgerId);
  return computed<FoodMenuItem[]>(() => {
    const arr = list.value;
    return [...arr].sort((a, b) => a.createdAt - b.createdAt);
  });
}
