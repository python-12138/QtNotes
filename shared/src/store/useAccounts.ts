import { getDataProvider } from '../data/provider';
import { currentLedgerId } from './currentLedger';

// 当前账本下的账户（响应式）
export function useAccounts() {
  return getDataProvider().queryAccounts(currentLedgerId);
}
