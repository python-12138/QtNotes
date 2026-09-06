import { computed, ref } from 'vue';
import { getDataProvider } from '../data/provider';
import type { Ledger } from '../types';

// 当前账本 id 持久化在 localStorage，方便下次打开时恢复到上次的账本。
const STORAGE_KEY = 'currentLedgerId';

/** 当前账本 id（全局响应式单例） */
export const currentLedgerId = ref<string>('');

/** 账本列表（响应式） */
export function useLedgers() {
  return getDataProvider().queryLedgers();
}

/** 当前账本对象（找不到时回退到第一本） */
export function useCurrentLedger() {
  const ledgers = useLedgers();
  return computed<Ledger | null>(() => {
    return ledgers.value.find((l) => l.id === currentLedgerId.value) ?? ledgers.value[0] ?? null;
  });
}

/** 初始化：从 localStorage 恢复，缺省取第一本账本 */
export async function initCurrentLedger(): Promise<void> {
  const saved = localStorage.getItem(STORAGE_KEY);
  const ledgers = await getDataProvider().listLedgers();
  currentLedgerId.value =
    saved && ledgers.some((l) => l.id === saved) ? saved : (ledgers[0]?.id ?? '');
}

/** 切换账本并持久化 */
export function setCurrentLedger(id: string): void {
  currentLedgerId.value = id;
  localStorage.setItem(STORAGE_KEY, id);
}
