import { getDataProvider } from '../data/provider';
import { currentLedgerId } from './currentLedger';

// 当前账本下的分类（响应式）
export function useCategories() {
  return getDataProvider().queryCategories(currentLedgerId);
}
