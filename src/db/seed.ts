import { db } from './db';
import { uid } from '../utils/id';
import type { Account, Category, Ledger, LedgerType } from './types';

// 默认账户（每个账本独立一套）
function defaultAccounts(ledgerId: string): Account[] {
  return [
    { id: uid(), ledgerId, name: '现金', icon: '💵' },
    { id: uid(), ledgerId, name: '微信', icon: '💬' },
    { id: uid(), ledgerId, name: '支付宝', icon: '📱' },
    { id: uid(), ledgerId, name: '银行卡', icon: '💳' },
  ];
}

// 普通账本的默认分类（8 支出 + 5 收入）
function generalCategories(ledgerId: string): Category[] {
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

// 车辆账本的默认分类：「油费」为系统保护（isFuel + protected），不能删除
function vehicleCategories(ledgerId: string): Category[] {
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

// 按账本类型返回对应的默认分类
function categoriesFor(ledgerId: string, type: LedgerType): Category[] {
  return type === 'vehicle' ? vehicleCategories(ledgerId) : generalCategories(ledgerId);
}

// 首次启动：无账本时创建默认「日常账本」
export async function seedIfEmpty(): Promise<void> {
  if ((await db.ledgers.count()) === 0) {
    await createLedger('日常账本', 'general');
  }
}

// 新建账本：同时播种其分类与账户
export async function createLedger(name: string, type: LedgerType): Promise<Ledger> {
  const ledger: Ledger = {
    id: uid(),
    name,
    type,
    icon: type === 'vehicle' ? '🚗' : '📒',
    color: type === 'vehicle' ? '#3b82f6' : '#22c55e',
    createdAt: Date.now(),
  };
  await db.transaction('rw', db.ledgers, db.categories, db.accounts, async () => {
    await db.ledgers.add(ledger);
    await db.categories.bulkAdd(categoriesFor(ledger.id, type));
    await db.accounts.bulkAdd(defaultAccounts(ledger.id));
  });
  return ledger;
}

// 删除账本：连同其分类、账户、流水一起删除；至少保留一本
export async function deleteLedger(id: string): Promise<void> {
  if ((await db.ledgers.count()) <= 1) {
    alert('至少保留一本账本');
    return;
  }
  if (!confirm('删除账本将同时删除其下所有账单，确定？')) return;
  await db.transaction('rw', db.ledgers, db.transactions, db.categories, db.accounts, async () => {
    await db.ledgers.delete(id);
    await db.transactions.where('ledgerId').equals(id).delete();
    await db.categories.where('ledgerId').equals(id).delete();
    await db.accounts.where('ledgerId').equals(id).delete();
  });
}
