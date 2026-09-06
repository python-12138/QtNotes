import { computed } from 'vue';
import { db } from '../db/db';
import { useLiveQuery } from './useLiveQuery';
import { currentLedgerId } from './currentLedger';

// 当前账本下的分类（响应式）
export function useCategories() {
  const list = useLiveQuery(
    () => db.categories.where('ledgerId').equals(currentLedgerId.value).toArray(),
    [currentLedgerId],
  );
  return computed(() => list.value ?? []);
}
