import { computed } from 'vue';
import { db } from '../db/db';
import { useLiveQuery } from './useLiveQuery';
import { currentLedgerId } from './currentLedger';

// 当前账本下的账户（响应式）
export function useAccounts() {
  const list = useLiveQuery(
    () => db.accounts.where('ledgerId').equals(currentLedgerId.value).toArray(),
    [currentLedgerId],
  );
  return computed(() => list.value ?? []);
}
