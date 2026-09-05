import Dexie, { type Table } from 'dexie';
import type { Ledger, Transaction, Category, Account } from './types';

// 本地数据库封装（基于 IndexedDB）。Dexie 自动管理表结构与索引。
export class BookkeepingDB extends Dexie {
  ledgers!: Table<Ledger, string>;
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  accounts!: Table<Account, string>;

  constructor() {
    super('bookkeeping');

    // v1：旧 schema（保留升级链；v2 重写后旧数据不再迁移）
    this.version(1).stores({
      transactions: 'id, type, date, categoryId, accountId, createdAt',
      categories: 'id, type',
      accounts: 'id',
    });

    // v2：多账本 + 加油字段（每个表都带 ledgerId 做账本隔离）
    this.version(2).stores({
      ledgers: 'id, type, createdAt',
      transactions: 'id, ledgerId, type, date, categoryId, accountId, createdAt',
      categories: 'id, ledgerId, type',
      accounts: 'id, ledgerId',
    });
  }
}

export const db = new BookkeepingDB();
