// 建账本时播种的默认分类 / 账户（纯函数，无数据源依赖）。
// 手机端 DexieProvider 与电脑端 ServerProvider 共用同一套默认值。
import { uid } from '../utils/id';
import type { Account, Category, LedgerType } from '../types';

/** 默认账户（每个账本独立一套） */
export function defaultAccounts(ledgerId: string): Account[] {
  return [
    { id: uid(), ledgerId, name: '现金', icon: '💵' },
    { id: uid(), ledgerId, name: '微信', icon: '💬' },
    { id: uid(), ledgerId, name: '支付宝', icon: '📱' },
    { id: uid(), ledgerId, name: '银行卡', icon: '💳' },
  ];
}

/** 普通账本的默认分类（8 支出 + 5 收入） */
export function generalCategories(ledgerId: string): Category[] {
  return [
    { id: uid(), ledgerId, name: '餐饮', type: 'expense', icon: '🍜', color: '#f97316', isDefault: true },
    { id: uid(), ledgerId, name: '交通', type: 'expense', icon: '🚗', color: '#3b82f6', isDefault: true },
    { id: uid(), ledgerId, name: '购物', type: 'expense', icon: '🛍️', color: '#ec4899', isDefault: true },
    { id: uid(), ledgerId, name: '住房', type: 'expense', icon: '🏠', color: '#8b5cf6', isDefault: true },
    { id: uid(), ledgerId, name: '娱乐', type: 'expense', icon: '🎮', color: '#06b6d4', isDefault: true },
    { id: uid(), ledgerId, name: '医疗', type: 'expense', icon: '💊', color: '#ef4444', isDefault: true },
    { id: uid(), ledgerId, name: '教育', type: 'expense', icon: '📚', color: '#14b8a6', isDefault: true },
    { id: uid(), ledgerId, name: '其他', type: 'expense', icon: '📦', color: '#64748b', isDefault: true },
    { id: uid(), ledgerId, name: '工资', type: 'income', icon: '💰', color: '#22c55e', isDefault: true },
    { id: uid(), ledgerId, name: '奖金', type: 'income', icon: '🧧', color: '#eab308', isDefault: true },
    { id: uid(), ledgerId, name: '理财', type: 'income', icon: '📈', color: '#10b981', isDefault: true },
    { id: uid(), ledgerId, name: '兼职', type: 'income', icon: '💼', color: '#84cc16', isDefault: true },
    { id: uid(), ledgerId, name: '其他', type: 'income', icon: '🎁', color: '#a855f7', isDefault: true },
  ];
}

/** 车辆账本的默认分类：「油费」为系统保护（isFuel + protected），不能删除 */
export function vehicleCategories(ledgerId: string): Category[] {
  return [
    { id: uid(), ledgerId, name: '油费', type: 'expense', icon: '⛽', color: '#f97316', isDefault: true, protected: true, isFuel: true },
    { id: uid(), ledgerId, name: '停车费', type: 'expense', icon: '🅿️', color: '#3b82f6', isDefault: true },
    { id: uid(), ledgerId, name: '过路费', type: 'expense', icon: '🛣️', color: '#06b6d4', isDefault: true },
    { id: uid(), ledgerId, name: '保养', type: 'expense', icon: '🔧', color: '#8b5cf6', isDefault: true },
    { id: uid(), ledgerId, name: '保险', type: 'expense', icon: '🛡️', color: '#14b8a6', isDefault: true },
    { id: uid(), ledgerId, name: '洗车', type: 'expense', icon: '🧽', color: '#ec4899', isDefault: true },
    { id: uid(), ledgerId, name: '维修', type: 'expense', icon: '🛠️', color: '#ef4444', isDefault: true },
    { id: uid(), ledgerId, name: '其他', type: 'expense', icon: '📦', color: '#64748b', isDefault: true },
    { id: uid(), ledgerId, name: '报销', type: 'income', icon: '🧾', color: '#22c55e', isDefault: true },
    { id: uid(), ledgerId, name: '卖车', type: 'income', icon: '🚗', color: '#eab308', isDefault: true },
    { id: uid(), ledgerId, name: '其他', type: 'income', icon: '🎁', color: '#a855f7', isDefault: true },
  ];
}

/** 按账本类型返回对应的默认分类 */
export function categoriesFor(ledgerId: string, type: LedgerType): Category[] {
  return type === 'vehicle' ? vehicleCategories(ledgerId) : generalCategories(ledgerId);
}
