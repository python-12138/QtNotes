import { computed } from 'vue';
import { getDataProvider } from '../data/provider';
import { currentLedgerId } from './currentLedger';
import type { TripRecord } from '../types';

// 当前账本下的「每次行驶」记录，按日期倒序（日期相同再按创建时间倒序）
export function useTrips() {
  const list = getDataProvider().queryTrips(currentLedgerId);
  return computed<TripRecord[]>(() => {
    const arr = list.value;
    return [...arr].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  });
}
