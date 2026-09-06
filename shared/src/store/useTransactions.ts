import { computed } from 'vue';
import { getDataProvider } from '../data/provider';
import { currentLedgerId } from './currentLedger';

// 当前账本下的流水，按日期倒序（日期相同再按创建时间倒序）
export function useTransactions() {
  const list = getDataProvider().queryTransactions(currentLedgerId);
  return computed(() => {
    const arr = list.value;
    return [...arr].sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
    );
  });
}
